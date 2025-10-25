import pool from '../config/db';

export interface Estimate {
  user_id: number;
  address_id: number;
  address_value: string;

  estimate_offer_min : string;
  estimate_offer_max : string;
  estimate_offer_value : string;

  underwrite_rent: string;
  underwrite_expense: string;
  underwrite_cap_rate : string;
  underwrite_selling_costs : string;
  underwrite_holding_costs : string;
  underwrite_margin : string;
  underwrite_low : string;
  underwrite_high : string;

  rental_or_flip: boolean;

  after_repair_value: string;

}

/**
 * Insert or Update Estimate
 */
export const saveEstimate = async (estimate: Estimate): Promise<void> => {
  const client = await pool.connect();
  const query = `
    INSERT INTO estimate (
      user_id, 
      address_value, 
      estimate_offer_min, 
      estimate_offer_max, 
      estimate_offer_value, 
      underwrite_rent, 
      underwrite_expense, 
      underwrite_cap_rate, 
      underwrite_selling_costs, 
      underwrite_holding_costs, 
      underwrite_margin, 
      underwrite_low, 
      underwrite_high, 
      rental_or_flip, 
      after_repair_value,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5, 
      $6, $7, $8, $9, $10, 
      $11, $12, $13, $14, 
      $15, NOW()
    )
    ON CONFLICT (address_id) 
    DO UPDATE SET
      address_value = EXCLUDED.address_value,
      estimate_offer_min = EXCLUDED.estimate_offer_min,
      estimate_offer_max = EXCLUDED.estimate_offer_max,
      estimate_offer_value = EXCLUDED.estimate_offer_value,
      underwrite_rent = EXCLUDED.underwrite_rent,
      underwrite_expense = EXCLUDED.underwrite_expense,
      underwrite_cap_rate = EXCLUDED.underwrite_cap_rate,
      underwrite_selling_costs = EXCLUDED.underwrite_selling_costs,
      underwrite_holding_costs = EXCLUDED.underwrite_holding_costs,
      underwrite_margin = EXCLUDED.underwrite_margin,
      underwrite_low = EXCLUDED.underwrite_low,
      underwrite_high = EXCLUDED.underwrite_high,
      rental_or_flip = EXCLUDED.rental_or_flip,
      after_repair_value = EXCLUDED.after_repair_value,
      created_at = NOW();
  `;

  const values = [
    estimate.user_id,
    estimate.address_value,
    estimate.estimate_offer_min,
    estimate.estimate_offer_max,
    estimate.estimate_offer_value,
    estimate.underwrite_rent,
    estimate.underwrite_expense,
    estimate.underwrite_cap_rate,
    estimate.underwrite_selling_costs,
    estimate.underwrite_holding_costs,
    estimate.underwrite_margin,
    estimate.underwrite_low,
    estimate.underwrite_high,
    estimate.rental_or_flip,
    estimate.after_repair_value
  ];

  try {
    await client.query(query, values);
    console.log('✅ Estimate saved successfully!');
  } catch (error) {
    console.error('❌ Error saving estimate:', error);
    throw error;
  }
};

export const getAllEstimates = async (): Promise<any[]> => {
  const client = await pool.connect();

  const query = `
    SELECT 
      user_id, 
      address_id, 
      address_value, 
      estimate_offer_min, 
      estimate_offer_max, 
      estimate_offer_value, 
      underwrite_rent, 
      underwrite_expense, 
      underwrite_cap_rate, 
      underwrite_selling_costs, 
      underwrite_holding_costs, 
      underwrite_margin, 
      underwrite_low, 
      underwrite_high, 
      rental_or_flip, 
      after_repair_value, 
      created_at
    FROM estimate
    ORDER BY created_at DESC;
  `;

  try {
    const result = await client.query(query);
    console.log('✅ Estimates retrieved successfully!');
    return result.rows;
  } catch (error) {
    console.error('❌ Error retrieving estimates:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getSingleEstimate = async (addressId: number): Promise<any> => {
  const client = await pool.connect();

  const query = `
    SELECT 
      user_id, 
      address_id, 
      address_value, 
      estimate_offer_min, 
      estimate_offer_max, 
      estimate_offer_value, 
      underwrite_rent, 
      underwrite_expense, 
      underwrite_cap_rate, 
      underwrite_selling_costs, 
      underwrite_holding_costs, 
      underwrite_margin, 
      underwrite_low, 
      underwrite_high, 
      rental_or_flip, 
      after_repair_value, 
      created_at
    FROM estimate
    WHERE address_id = $1;
  `;

  try {
    const result = await client.query(query, [addressId]);

    if (result.rows.length === 0) {
      return null; // No record found
    }

    console.log(`✅ Estimate with address_id ${addressId} retrieved successfully!`);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ Error retrieving estimate with address_id ${addressId}:`, error);
    throw error;
  } finally {
    client.release();
  }
};
