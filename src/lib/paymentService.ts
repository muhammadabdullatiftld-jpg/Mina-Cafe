import { getSupabaseServerClient } from './supabaseServer.js';

export interface SubmitPaymentInput {
  trackingToken: string;
  transactionId: string;
  screenshotBase64?: string;
  screenshotFileName?: string;
}

export interface SubmitPaymentResult {
  success: boolean;
  orderId?: string;
  orderRef?: string;
  status?: string;
  transactionId?: string;
  paymentProofUrl?: string;
  error?: string;
}

/**
 * Handle server-side payment submission using privileged SUPABASE_SERVICE_ROLE_KEY
 */
export async function submitPaymentServerSide(
  input: SubmitPaymentInput
): Promise<SubmitPaymentResult> {
  const { trackingToken, transactionId, screenshotBase64, screenshotFileName } = input;

  if (!trackingToken || typeof trackingToken !== 'string') {
    return { success: false, error: 'Tracking token is required.' };
  }

  const trimmedTxId = (transactionId || '').trim();
  if (!trimmedTxId || trimmedTxId.length < 3) {
    return { success: false, error: 'Please enter a valid EasyPaisa Transaction ID.' };
  }

  const supabase = getSupabaseServerClient();

  try {
    // 1. Locate order by exact tracking_token match
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_ref, status')
      .eq('tracking_token', trackingToken)
      .single();

    if (orderErr || !orderRow) {
      return { success: false, error: 'Order not found or invalid tracking token.' };
    }

    let paymentProofUrl: string | null = null;

    // 2. Handle optional screenshot upload
    if (screenshotBase64) {
      try {
        let mimeType = 'image/jpeg';
        let base64Data = screenshotBase64;

        if (screenshotBase64.includes(';base64,')) {
          const parts = screenshotBase64.split(';base64,');
          const header = parts[0];
          base64Data = parts[1];
          const matches = header.match(/data:(image\/[a-zA-Z0-9\+\-\.]+)/);
          if (matches && matches[1]) {
            mimeType = matches[1];
          }
        }

        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
          return {
            success: false,
            error: 'Invalid file format. Please upload a JPEG, PNG, or WebP screenshot.',
          };
        }

        const buffer = Buffer.from(base64Data, 'base64');
        const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
        if (buffer.length > maxSizeBytes) {
          return {
            success: false,
            error: 'Screenshot image size exceeds 5MB limit. Please upload a smaller image.',
          };
        }

        const extMap: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
        };
        const ext = extMap[mimeType.toLowerCase()] || 'jpg';
        const fileName = `${orderRow.id}/${Date.now()}_proof.${ext}`;

        const bucketName = 'payment-proofs';

        // Check or upload to payment-proofs bucket
        const { error: uploadErr } = await supabase.storage
          .from(bucketName)
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadErr) {
          console.warn('Supabase storage upload warning:', uploadErr.message);
          // Fallback: If bucket isn't created or configured yet, attempt to create bucket
          if (uploadErr.message?.includes('bucket not found') || uploadErr.message?.includes('Bucket')) {
            await supabase.storage.createBucket(bucketName, { public: true });
            const { error: retryErr } = await supabase.storage
              .from(bucketName)
              .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: true,
              });
            if (!retryErr) {
              const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
              paymentProofUrl = urlData?.publicUrl || fileName;
            }
          }
        } else {
          const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
          paymentProofUrl = urlData?.publicUrl || fileName;
        }
      } catch (uploadException: any) {
        console.warn('Screenshot processing exception:', uploadException);
        // Continue payment recording even if screenshot upload fails gracefully
      }
    }

    // 3. Upsert or update payment row in database
    const { data: existingPay } = await supabase
      .from('payments')
      .select('id')
      .eq('order_id', orderRow.id)
      .maybeSingle();

    if (existingPay) {
      const { error: updatePayErr } = await supabase
        .from('payments')
        .update({
          transaction_id: trimmedTxId,
          payment_proof_url: paymentProofUrl || undefined,
          payment_status: 'Verification Pending',
        })
        .eq('id', existingPay.id);

      if (updatePayErr) {
        console.error('Payment update error:', updatePayErr);
      }
    } else {
      const { error: insertPayErr } = await supabase.from('payments').insert({
        order_id: orderRow.id,
        transaction_id: trimmedTxId,
        payment_proof_url: paymentProofUrl || null,
        payment_status: 'Verification Pending',
      });

      if (insertPayErr) {
        console.error('Payment insert error:', insertPayErr);
      }
    }

    // 4. Update order status to 'Verification Pending'
    const { error: updateOrderErr } = await supabase
      .from('orders')
      .update({
        status: 'Verification Pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderRow.id);

    if (updateOrderErr) {
      console.error('Order status update error:', updateOrderErr);
    }

    return {
      success: true,
      orderId: orderRow.id,
      orderRef: orderRow.order_ref,
      status: 'Verification Pending',
      transactionId: trimmedTxId,
      paymentProofUrl: paymentProofUrl || undefined,
    };
  } catch (err: any) {
    console.error('submitPaymentServerSide error:', err);
    return {
      success: false,
      error: err.message || 'Server error processing payment submission.',
    };
  }
}
