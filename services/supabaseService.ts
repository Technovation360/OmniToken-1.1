
import { createClient } from '@supabase/supabase-js';
import { AppState, User } from '../types';

const SUPABASE_URL = 'https://qyfllmvtsavdtnyahrcu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5ZmxsbXZ0c2F2ZHRueWFocmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTc0MDEsImV4cCI6MjA4MzY5MzQwMX0.Ttm9fC4HdRYpakMQZ3N2FWuzXUrEiU3VlQANIWm1vV8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Records a login event in the login_logs table.
 */
const recordLoginLog = async (user: User) => {
  try {
    await supabase.from('login_logs').insert({
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId || null,
      loginAt: Date.now(),
      userAgent: navigator.userAgent
    });
  } catch (err) {
    console.error("Failed to record login log:", err);
  }
};

/**
 * Validates credentials against the Supabase users table.
 * Automatically records a login log on success.
 */
export const loginWithSupabase = async (email: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .maybeSingle(); // Changed from .single() to handle 0 results gracefully

    if (error) {
      console.error("Supabase Query Error:", error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    const user = data as User;
    
    // Fire and forget the log entry recording
    recordLoginLog(user);

    return user;
  } catch (err) {
    console.error("Critical Auth Error:", err);
    return null;
  }
};

/**
 * Fetches platform data filtered by user permissions.
 */
export const fetchStateForUser = async (user: User): Promise<Partial<AppState>> => {
  try {
    const isCentralAdmin = user.role === 'CENTRAL_ADMIN';
    const isClinicStaff = ['CLINIC_ADMIN', 'DOCTOR', 'ASSISTANT', 'SCREEN'].includes(user.role);
    const isAdvertiser = user.role === 'ADVERTISER';

    const newState: any = {};

    // 1. Fetch Shared Data (Specialties)
    const { data: specialties } = await supabase.from('specialties').select('*');
    newState.specialties = specialties || [];

    // 2. Conditional Fetching based on Role
    if (isCentralAdmin) {
      // Central Admin sees everything
      const tables = ['clinics', 'users', 'advertisers', 'cabins', 'forms', 'tokens', 'videos', 'groups'];
      const results = await Promise.all(tables.map(t => supabase.from(t).select('*')));
      tables.forEach((t, i) => { newState[t] = results[i].data || []; });
    } 
    else if (isClinicStaff && user.clinicId) {
      // Clinic Staff only see their clinic's data
      const clinicId = user.clinicId;
      const [c, u, cb, f, t, g] = await Promise.all([
        supabase.from('clinics').select('*').eq('id', clinicId),
        supabase.from('users').select('*').eq('clinicId', clinicId),
        supabase.from('cabins').select('*').eq('clinicId', clinicId),
        supabase.from('forms').select('*').eq('clinicId', clinicId),
        supabase.from('tokens').select('*').eq('clinicId', clinicId),
        supabase.from('groups').select('*').eq('clinicId', clinicId)
      ]);

      newState.clinics = c.data || [];
      newState.users = u.data || [];
      newState.cabins = cb.data || [];
      newState.forms = f.data || [];
      newState.tokens = t.data || [];
      newState.groups = g.data || [];

      // Also need videos for the screens
      const { data: v } = await supabase.from('videos').select('*');
      newState.videos = v || [];
    }
    else if (isAdvertiser && user.advertiserId) {
      // Advertiser only sees their campaigns
      const advId = user.advertiserId;
      const [adv, vid] = await Promise.all([
        supabase.from('advertisers').select('*').eq('id', advId),
        supabase.from('videos').select('*').eq('advertiserId', advId)
      ]);
      newState.advertisers = adv.data || [];
      newState.videos = vid.data || [];
    }

    return newState;
  } catch (error) {
    console.error("Error fetching state:", error);
    return {};
  }
};

/**
 * Generic Upsert function to sync state changes to Supabase
 */
export const syncUpsert = async (table: string, data: any) => {
  const { error } = await supabase
    .from(table)
    .upsert(data);
  if (error) console.error(`Error syncing ${table}:`, error);
  return !error;
};

/**
 * Generic Delete function for Supabase
 */
export const syncDelete = async (table: string, id: string) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  if (error) console.error(`Error deleting from ${table}:`, error);
  return !error;
};
