import { query } from '../lib/db.js';

/**
 * POST /api/applicants — Save extracted applicant data (called by frontend after extraction)
 */
export async function handlePostApplicant(req, res, body) {
  try {
    const { name, passport_number, nationality, passport_data, work_permit_data, field_verification, mrz_quality, processed_by } = body;

    if (!name) {
      return json(res, 400, { error: 'name is required.' });
    }

    const result = await query(
      `INSERT INTO applicants (name, passport_number, nationality, passport_data, work_permit_data, field_verification, mrz_quality, processed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        name,
        passport_number || null,
        nationality || null,
        passport_data ? JSON.stringify(passport_data) : null,
        work_permit_data ? JSON.stringify(work_permit_data) : null,
        field_verification ? JSON.stringify(field_verification) : null,
        mrz_quality || null,
        processed_by || 'unknown',
      ]
    );

    return json(res, 200, { status: 'ok', id: result.rows[0].id });
  } catch (err) {
    console.error('Applicant save error:', err.message);
    return json(res, 500, { error: err.message });
  }
}

/**
 * GET /api/applicants — List recent applicants (for extension popup)
 */
export async function handleGetApplicants(req, res, url) {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const result = await query(
      `SELECT id, name, passport_number, nationality, mrz_quality, processed_by, created_at,
              work_permit_data IS NOT NULL AS has_work_permit
       FROM applicants
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return json(res, 200, { applicants: result.rows });
  } catch (err) {
    // If table doesn't exist, return empty
    if (err.message?.includes('does not exist')) {
      return json(res, 200, { applicants: [] });
    }
    console.error('Applicants list error:', err.message);
    return json(res, 500, { error: err.message });
  }
}

/**
 * GET /api/applicants/:id — Get full applicant data (for extension fill)
 */
export async function handleGetApplicantById(req, res, id) {
  try {
    const result = await query(
      `SELECT id, name, passport_number, nationality, passport_data, work_permit_data,
              field_verification, mrz_quality, processed_by, created_at
       FROM applicants WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return json(res, 404, { error: 'Applicant not found.' });
    }

    const row = result.rows[0];

    // Build flat fill_data map for the extension
    const fill_data = {};
    const pp = row.passport_data || {};
    const wp = row.work_permit_data || {};

    // Passport fields → fill_data
    if (pp.surname) fill_data['passport.surname'] = pp.surname;
    if (pp.first_name) fill_data['passport.first_name'] = pp.first_name;
    if (pp.second_name) fill_data['passport.second_name'] = pp.second_name;
    if (pp.third_name) fill_data['passport.third_name'] = pp.third_name;
    const fullName = [pp.surname, pp.first_name, pp.second_name, pp.third_name].filter(Boolean).join(' ');
    if (fullName) fill_data['passport.full_name'] = fullName;
    if (pp.passport_number) fill_data['passport.number'] = pp.passport_number;
    if (pp.nationality) fill_data['passport.nationality'] = pp.nationality;
    if (pp.date_of_birth) fill_data['passport.date_of_birth'] = pp.date_of_birth;
    if (pp.gender) fill_data['passport.sex'] = pp.gender;
    if (pp.issue_date) fill_data['passport.issue_date'] = pp.issue_date;
    if (pp.expiry_date) fill_data['passport.expiry_date'] = pp.expiry_date;
    if (pp.place_of_issue) fill_data['passport.place_of_issue'] = pp.place_of_issue;
    if (pp.passport_country) fill_data['passport.passport_country'] = pp.passport_country;
    if (pp.city_of_birth) fill_data['passport.city_of_birth'] = pp.city_of_birth;
    if (pp.country_of_birth) fill_data['passport.country_of_birth'] = pp.country_of_birth;

    // Work permit fields → fill_data
    if (wp.wfpa_number) fill_data['work_permit.wfpa_number'] = wp.wfpa_number;
    if (wp.pa_number) fill_data['work_permit.pa_number'] = wp.pa_number;
    if (wp.sponsor_name) fill_data['work_permit.employer'] = wp.sponsor_name;
    if (wp.civil_id) fill_data['work_permit.sponsor_id'] = wp.civil_id;
    if (wp.phone_number) fill_data['work_permit.sponsor_phone'] = wp.phone_number;
    if (wp.mobile_number) fill_data['work_permit.sponsor_mobile'] = wp.mobile_number;
    if (wp.address) fill_data['work_permit.sponsor_address'] = wp.address;
    if (wp.occupation_code) fill_data['work_permit.occupation_code'] = wp.occupation_code;
    if (wp.occupation_description) fill_data['work_permit.occupation_desc'] = wp.occupation_description;
    if (wp.expiry_date) fill_data['work_permit.expiry_date'] = wp.expiry_date;

    return json(res, 200, {
      applicant: {
        id: row.id,
        name: row.name,
        passport_number: row.passport_number,
        nationality: row.nationality,
        mrz_quality: row.mrz_quality,
        processed_by: row.processed_by,
        created_at: row.created_at,
        passport_data: row.passport_data,
        work_permit_data: row.work_permit_data,
        field_verification: row.field_verification,
        fill_data,
      },
    });
  } catch (err) {
    console.error('Applicant fetch error:', err.message);
    return json(res, 500, { error: err.message });
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
