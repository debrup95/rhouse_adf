import pool from '../../config/db';
import { Property } from '../model/propertyModel';
import axios from "axios";

export async function savePropertyData(property: Property) {
    const client = await pool.connect();
    const API_KEY = process.env.PARCL_LABS_API_KEY || '';
    const eventHistoryUrl = `https://api.parcllabs.com/v1/property/event_history`;


    try {
        await client.query('BEGIN');
        const insertAddressQuery = `
            INSERT INTO brnz_goog_prop_add_dtl (
                load_date_dt,
                record_inserted_ts,
                prop_address_line_txt,
                prop_city_nm,
                prop_state_nm,
                prop_cnty_nm,
                prop_zip_cd
            )
            VALUES (
                       CURRENT_DATE,
                       $1,
                       $2,
                       $3,
                       $4,
                       $5,
                       $6
                   )
                RETURNING brnz_goog_prop_add_dtl_sk
        `;

        const insertAddressValues = [
            new Date(),
            property.address,
            property.city,
            property.stateAbbreviation,
            property.county,
            property.zipCode,
        ];

        const addressResult = await client.query(insertAddressQuery, insertAddressValues);
        const brnzGooglePropAddDtlSk = addressResult.rows[0].brnz_goog_prop_add_dtl_sk;

        console.log("Prop ID is..." + property.parclPropertyId);

        const eventHistoryPromise = axios.post(
            eventHistoryUrl,
                {
                    parcl_property_id: [String(property.parclPropertyId)]
                },
            {
                headers: {
                    'Authorization': API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        const [eventHistoryResponse] = await Promise.all([
            eventHistoryPromise,
        ]);

        const eventItems = eventHistoryResponse.data.items || [];

        const soldEvents = eventItems.filter((event: any) => event.event_name === 'SOLD');
        let latestSaleDate = null;
        let latestSaleAmount = null;
        if (soldEvents.length > 0) {
            const latestSaleEvent = soldEvents.reduce((prev: any, curr: any) =>
                new Date(curr.event_date) > new Date(prev.event_date) ? curr : prev
            );

            latestSaleDate = latestSaleEvent.event_date;
            latestSaleAmount = latestSaleEvent.price;
        }

        const insertSalesQuery = `
            INSERT INTO brnz_prcl_prop_sales_dtl (
                load_date_dt,
                brnz_goog_prop_add_dtl_fk,
                record_inserted_ts,
                investor_company_nm_txt,
                prop_attr_bth_cnt,
                prop_attr_br_cnt,
                prop_attr_sqft_nr,
                prop_yr_blt_nr,
                prop_address_line_txt,
                prop_city_nm,
                prop_state_nm,
                prop_cnty_nm,
                prop_zip_cd,
                prop_list_price_amt,
                prop_status_cd,
                prop_acty_sub_status_cd,
                prop_acty_status_cd,
                prop_latitude_val,
                prop_longitude_val
            )
            VALUES (
                       CURRENT_DATE,
                       $1,
                       $2,
                       $3,
                       $4,
                       $5,
                       $6,
                       $7,
                       $8,
                       $9,
                       $10,
                       $11,
                       $12,
                       $13,
                       $14,
                       $15,
                       $16,
                       $17,
                       $18
                   )
                RETURNING brnz_prcl_prop_sales_dtl_sk
        `;

        const salesValues = [
            brnzGooglePropAddDtlSk,
            new Date(),
            property.investorCompany || null,
            property.bathrooms,
            property.bedrooms,
            property.squareFootage,
            property.yearBuilt,
            property.address,
            property.city,
            property.stateAbbreviation,
            property.county,
            property.zipCode,
            latestSaleAmount,
            '',
            '',
            '',
            property.latitude,
            property.longitude
        ];

        const salesResult = await client.query(insertSalesQuery, salesValues);
        const brnzPrclPropSalesDtlSk = salesResult.rows[0].brnz_prcl_prop_sales_dtl_sk;

        await client.query('COMMIT');

        console.error("Keys are..." + brnzGooglePropAddDtlSk + "..." + brnzPrclPropSalesDtlSk);

        return {
            brnzGooglePropAddDtlSk,
            brnzPrclPropSalesDtlSk,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
