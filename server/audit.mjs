import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const tables = ['subscribers', 'price_check_leads'];
for (const t of tables) {
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(t, 'count:', r.rows[0].count);
  } catch (e) { console.log(t, 'ERROR:', e.message); }
}

const sub = await pool.query(`SELECT subscription_status, COUNT(*) FROM subscribers GROUP BY subscription_status`);
console.log('subscription_status breakdown:', JSON.stringify(sub.rows));

const stripeIds = await pool.query(`SELECT email, subscription_status, stripe_subscription_id, created_at FROM subscribers ORDER BY created_at DESC LIMIT 20`);
console.log('recent subscribers:', JSON.stringify(stripeIds.rows, null, 2));

const leads = await pool.query(`SELECT email, keywords, created_at FROM price_check_leads WHERE email IS NOT NULL ORDER BY created_at DESC LIMIT 30`);
console.log('recent leads with email:', JSON.stringify(leads.rows, null, 2));

const leadCount = await pool.query(`SELECT COUNT(*) FROM price_check_leads WHERE email IS NOT NULL`);
console.log('total leads with email:', leadCount.rows[0].count);

await pool.end();
