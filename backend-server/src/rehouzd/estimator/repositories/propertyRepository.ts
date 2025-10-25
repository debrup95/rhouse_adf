import { Pool, QueryResult } from "pg";
import { Property } from "../models/property/propertyModel";
import pool, { query } from "../config/db";
import logger from "../utils/logger";
import { AppError } from "../middleware/errorHandler";

class PropertyRepository {
  /**
   * Save property address details to the database
   */
  async savePropertyAddress(
    property: Property,
    userId?: number,
    sessionId?: string,
    searchType: string = "address_lookup",
    searchSource: string = "web_app"
  ): Promise<{ addressId: number }> {
    try {
      const insertAddressQuery = `
        INSERT INTO bronze.brnz_goog_prop_add_dtl (
          load_date_dt,
          record_inserted_ts,
          prop_address_line_txt,
          prop_city_nm,
          prop_state_nm,
          prop_cnty_nm,
          prop_zip_cd,
          searched_by_user_id,
          search_session_id,
          searched_at,
          search_type,
          search_source,
          results_found
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
          $12
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
        userId || null,
        sessionId || null,
        new Date(),
        searchType,
        searchSource,
        true, // results_found - true since we're saving the address
      ];

      logger.debug("Saving property address", { address: property.address });
      const result = await query(insertAddressQuery, insertAddressValues);

      return { addressId: result.rows[0].brnz_goog_prop_add_dtl_sk };
    } catch (error: any) {
      logger.error("Failed to save property address", {
        error: error.message,
        property: property.address,
      });
      logger.error("Failed to save property address", {
        error: error.message,
        property: property.address,
      });
      logger.error(
        "Failed to save property address",
        +error.message + property.address
      );
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Save property sales details to the database
   */
  async savePropertySales(
    addressId: number,
    property: Property,
    salePrice: number | null
  ): Promise<{ salesId: number }> {
    try {
      const insertSalesQuery = `
        INSERT INTO bronze.brnz_prcl_prop_sales_dtl (
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
        addressId,
        new Date(),
        property.investorCompany || null,
        Math.round(property.bathrooms * 10),
        property.bedrooms,
        property.squareFootage,
        property.yearBuilt,
        property.address,
        property.city,
        property.stateAbbreviation,
        property.county,
        property.zipCode,
        salePrice,
        "",
        "",
        "",
        property.latitude,
        property.longitude,
      ];

      logger.debug("Saving property sales", { address: property.address });
      const result = await query(insertSalesQuery, salesValues);

      return { salesId: result.rows[0].brnz_prcl_prop_sales_dtl_sk };
    } catch (error: any) {
      logger.error("Failed to save property sales", {
        error: error.message,
        property: property.address,
        addressId,
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Save complete property data in a transaction
   */
  async savePropertyData(
    property: Property,
    salePrice: number | null = null,
    userId?: number,
    sessionId?: string,
    searchType: string = "property_details",
    searchSource: string = "web_app"
  ): Promise<{ addressId: number; salesId: number }> {
    const client = await pool.connect();

    // Input validation to prevent NaN values
    if (
      isNaN(property.bathrooms) ||
      isNaN(property.bedrooms) ||
      isNaN(property.squareFootage) ||
      isNaN(property.yearBuilt) ||
      isNaN(property.latitude) ||
      isNaN(property.longitude)
    ) {
      console.error("Invalid property data - NaN detected:", {
        bathrooms: property.bathrooms,
        bedrooms: property.bedrooms,
        squareFootage: property.squareFootage,
        yearBuilt: property.yearBuilt,
        latitude: property.latitude,
        longitude: property.longitude,
      });

      // Fix NaN values
      if (isNaN(property.bathrooms)) property.bathrooms = 0;
      if (isNaN(property.bedrooms)) property.bedrooms = 0;
      if (isNaN(property.squareFootage)) property.squareFootage = 0;
      if (isNaN(property.yearBuilt)) property.yearBuilt = 0;
      if (isNaN(property.latitude)) property.latitude = 0;
      if (isNaN(property.longitude)) property.longitude = 0;
    }

    // IMPORTANT: Convert decimal bathrooms to integer by multiplying by 10
    // Example: 1.5 bathrooms becomes 15 in the database
    // This is because the database column prop_attr_bth_cnt is defined as INTEGER
    // When retrieving data, we divide by 10 to get the decimal value back
    const bathroomsDb = Math.round(property.bathrooms * 10);

    try {
      await client.query("BEGIN");

      // Save address
      const insertAddressQuery = `
        INSERT INTO bronze.brnz_goog_prop_add_dtl (
          load_date_dt,
          record_inserted_ts,
          prop_address_line_txt,
          prop_city_nm,
          prop_state_nm,
          prop_cnty_nm,
          prop_zip_cd,
          searched_by_user_id,
          search_session_id,
          searched_at,
          search_type,
          search_source,
          results_found
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
          $12
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
        userId || null,
        sessionId || null,
        new Date(),
        searchType,
        searchSource,
        true, // results_found - true since we're saving the address
      ];

      logger.debug("Saving property data - address", {
        address: property.address,
      });
      const addressResult = await client.query(
        insertAddressQuery,
        insertAddressValues
      );
      const addressId = addressResult.rows[0].brnz_goog_prop_add_dtl_sk;

      // Save sales
      const insertSalesQuery = `
        INSERT INTO bronze.brnz_prcl_prop_sales_dtl (
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
        addressId,
        new Date(),
        property.investorCompany || null,
        bathroomsDb,
        property.bedrooms,
        property.squareFootage,
        property.yearBuilt,
        property.address,
        property.city,
        property.stateAbbreviation,
        property.county,
        property.zipCode,
        salePrice,
        "",
        "",
        "",
        property.latitude,
        property.longitude,
      ];

      logger.debug("Saving property data - sales", {
        address: property.address,
      });
      const salesResult = await client.query(insertSalesQuery, salesValues);
      const salesId = salesResult.rows[0].brnz_prcl_prop_sales_dtl_sk;

      await client.query("COMMIT");

      logger.info("Property data saved successfully", {
        address: property.address,
        addressId,
        salesId,
      });

      return { addressId, salesId };
    } catch (error: any) {
      logger.error("Failed to save property data in transaction", {
        error: error.message,
        property: property.address,
      });

      // Fix error message logging
      console.error(
        `Failed to save property data in transaction... ${error.message}`
      );

      await client.query("ROLLBACK");
      throw new AppError(`Database error: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  /**
   * Get property by ID
   */
  async getPropertyById(propertyId: number): Promise<Property | null> {
    try {
      const propertyQuery = `
        SELECT 
          b.prop_address_line_txt AS address,
          b.prop_city_nm AS city,
          b.prop_state_nm AS state_abbreviation,
          b.prop_cnty_nm AS county,
          b.prop_zip_cd AS zip_code,
          p.prop_attr_bth_cnt AS bathrooms,
          p.prop_attr_br_cnt AS bedrooms,
          p.prop_attr_sqft_nr AS square_footage,
          p.prop_yr_blt_nr AS year_built,
          p.investor_company_nm_txt AS investor_company,
          p.prop_latitude_val AS latitude,
          p.prop_longitude_val AS longitude,
          pm.parcl_property_id AS parcl_property_id
        FROM bronze.brnz_prcl_prop_sales_dtl p
        JOIN bronze.brnz_goog_prop_add_dtl b ON p.brnz_goog_prop_add_dtl_fk = b.brnz_goog_prop_add_dtl_sk
        LEFT JOIN property_parcl_mapping pm ON p.brnz_prcl_prop_sales_dtl_sk = pm.brnz_prcl_prop_sales_dtl_fk
        WHERE p.brnz_prcl_prop_sales_dtl_sk = $1
      `;

      const result = await query(propertyQuery, [propertyId]);

      if (result.rows.length === 0) {
        return null;
      }

      const propertyData = result.rows[0];

      return new Property(
        0, // etlNr
        propertyData.parcl_property_id || 0,
        propertyData.address,
        propertyData.city,
        propertyData.state_abbreviation,
        propertyData.county,
        propertyData.zip_code,
        propertyData.bathrooms / 10,
        propertyData.bedrooms,
        propertyData.square_footage,
        propertyData.year_built,
        propertyData.latitude,
        propertyData.longitude,
        propertyData.investor_company
      );
    } catch (error: any) {
      logger.error("Failed to get property by ID", {
        error: error.message,
        propertyId,
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Get search history for a user (last 15 unique searches)
   */
  async getUserSearchHistory(userId: number): Promise<any[]> {
    try {
      const searchHistoryQuery = `
        SELECT *
        FROM (
            SELECT DISTINCT ON (prop_address_line_txt, prop_city_nm, prop_state_nm, prop_zip_cd) 
                  brnz_goog_prop_add_dtl_sk AS id,
                  prop_address_line_txt AS address,
                  prop_city_nm AS city,
                  prop_state_nm AS state,
                  prop_zip_cd AS zip,
                  searched_at AS searchedAt,
                  search_type AS searchType
            FROM bronze.brnz_goog_prop_add_dtl 
            WHERE searched_by_user_id = $1
              AND prop_address_line_txt IS NOT NULL 
              AND prop_address_line_txt != ''
            ORDER BY prop_address_line_txt, prop_city_nm, prop_state_nm, prop_zip_cd, searched_at DESC
        ) t
        ORDER BY searchedAt DESC
        LIMIT 15
      `;

      logger.debug("Fetching search history for user", { userId });
      const result = await query(searchHistoryQuery, [userId]);

      return result.rows.map((row) => ({
        id: row.id.toString(),
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        fullAddress: `${row.address}, ${row.city}, ${row.state} ${row.zip}`,
        searchedAt: row.searchedat,
        searchType: row.searchtype,
      }));
    } catch (error: any) {
      logger.error("Failed to fetch search history", {
        error: error.message,
        userId,
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Get property by address and zip code
   */
  async getPropertyByAddress(
    address: string,
    zipCode: string
  ): Promise<Property | null> {
    try {
      const propertyQuery = `
        SELECT 
          b.prop_address_line_txt AS address,
          b.prop_city_nm AS city,
          b.prop_state_nm AS state_abbreviation,
          b.prop_cnty_nm AS county,
          b.prop_zip_cd AS zip_code,
          p.prop_attr_bth_cnt AS bathrooms,
          p.prop_attr_br_cnt AS bedrooms,
          p.prop_attr_sqft_nr AS square_footage,
          p.prop_yr_blt_nr AS year_built,
          p.investor_company_nm_txt AS investor_company,
          p.prop_latitude_val AS latitude,
          p.prop_longitude_val AS longitude,
          pm.parcl_property_id AS parcl_property_id,
          p.brnz_prcl_prop_sales_dtl_sk AS property_id
        FROM bronze.brnz_prcl_prop_sales_dtl p
        JOIN bronze.brnz_goog_prop_add_dtl b ON p.brnz_goog_prop_add_dtl_fk = b.brnz_goog_prop_add_dtl_sk
        LEFT JOIN property_parcl_mapping pm ON p.brnz_prcl_prop_sales_dtl_sk = pm.brnz_prcl_prop_sales_dtl_fk
        WHERE UPPER(b.prop_address_line_txt) = UPPER($1) AND b.prop_zip_cd = $2
        ORDER BY p.record_inserted_ts DESC
        LIMIT 1
      `;

      const result = await query(propertyQuery, [address, zipCode]);

      if (result.rows.length === 0) {
        return null;
      }

      const propertyData = result.rows[0];

      return new Property(
        propertyData.property_id,
        propertyData.parcl_property_id || 0,
        propertyData.address,
        propertyData.city,
        propertyData.state_abbreviation,
        propertyData.county,
        propertyData.zip_code,
        propertyData.bathrooms / 10,
        propertyData.bedrooms,
        propertyData.square_footage,
        propertyData.year_built,
        propertyData.latitude,
        propertyData.longitude,
        propertyData.investor_company
      );
    } catch (error: any) {
      logger.error("Failed to get property by address", {
        error: error.message,
        address,
        zipCode,
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }
}

export default new PropertyRepository();
