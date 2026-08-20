import { getSupabaseServerClient } from './supabaseServer.js';

export interface AdminVerifyResult {
  success: boolean;
  isAdmin: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

/**
 * Server-side verification of admin authentication & authorization.
 * 1. Verifies the user's Supabase Auth JWT token using Supabase Auth.
 * 2. Checks if the user is authorized in the `admin_users` table.
 * 3. Enforces server-side authorization for admin requests.
 */
export async function verifyAdminServerSide(authHeader?: string): Promise<AdminVerifyResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      isAdmin: false,
      error: 'Missing or invalid authorization header.',
    };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return {
      success: false,
      isAdmin: false,
      error: 'Empty authentication token.',
    };
  }

  const supabase = getSupabaseServerClient();

  // Verify JWT token with Supabase Auth
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return {
      success: false,
      isAdmin: false,
      error: userError?.message || 'Invalid or expired session token.',
    };
  }

  const user = userData.user;
  const userEmail = (user.email || '').toLowerCase().trim();

  try {
    // Attempt to query the admin_users table
    const { data: adminRows, error: adminQueryError } = await supabase
      .from('admin_users')
      .select('id, user_id, email, role')
      .or(`user_id.eq.${user.id},email.eq.${userEmail}`);

    if (!adminQueryError && adminRows && adminRows.length > 0) {
      return {
        success: true,
        isAdmin: true,
        user: {
          id: user.id,
          email: userEmail,
        },
      };
    }

    // Check count of admin_users to see if table is empty or missing
    const { count, error: countError } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true });

    // If admin_users table is empty or if error indicates missing table,
    // handle initializing the first authenticated user as admin
    if (!countError && (count === 0 || count === null)) {
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          email: userEmail,
          role: 'admin',
        });

      if (!insertError) {
        console.log(`[AdminAuth] Initialized first admin user: ${userEmail}`);
        return {
          success: true,
          isAdmin: true,
          user: {
            id: user.id,
            email: userEmail,
          },
        };
      }
    }

    return {
      success: false,
      isAdmin: false,
      error: 'Access denied: Your account is not authorized as an admin.',
    };
  } catch (err: any) {
    console.error('Admin verification exception:', err);
    return {
      success: false,
      isAdmin: false,
      error: 'Server error during admin authorization check.',
    };
  }
}
