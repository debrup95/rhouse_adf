# Database Schema Structure

This directory contains the database schema definitions for the Rehouzd Estimator application, organized into individual table files for better maintainability.

## Structure

- `index.sql`: Main entry point that includes all table definitions in the correct order
- Individual table definition files for each table in the database

## Table Organization

Tables are organized into logical groups:

1. **Users and Authentication**
   - `users.sql`: Core user accounts
   - `specialist_calls.sql`: Specialist call requests

2. **Property and Estimates**
   - `estimate.sql`: Property valuations
   - `saved_estimates.sql`: User-saved estimates
   - `property_images.sql`: Property image metadata

3. **Bronze Tables (Raw Data)**
   - `brnz_goog_prop_add_dtl.sql`: Raw property address data
   - `brnz_prcl_prop_sales_dtl.sql`: Raw property sales data

4. **Silver Tables (Processed Data)**
   - `slvr_int_prop_sales_dlt.sql`: Processed property sales data
   - `slvr_int_prop.sql`: Core property data
   - `slvr_int_prop_comps.sql`: Property comparables
   - `slvr_int_prop_offer_dtl.sql`: Property offer details

5. **Admin and Reference Tables**
   - `adm_ref_prop_condition.sql`: Property condition reference data
   - `adm_ctl_rules.sql`: System rules and configuration

6. **User Profile Tables**
   - `usr_prls_dtl.sql`: Extended user profiles
   - `usr_invst_conatact_dtl.sql`: Investor contacts
   - `usr_prop_offer_asm.sql`: Property offer assessments
   - `usr_prop_dtl.sql`: User property details

## Enhancements Added

1. **Foreign Key Constraints**: Added proper foreign key relationships between tables
2. **Indexes**: Added indexes for common query patterns to improve performance
3. **Triggers**: Added automatic timestamp updates
4. **Documentation**: Added comments for each table and its purpose

## Initialization

The schema is loaded by the custom schema loader in `../utils/schemaLoader.ts` which handles the PostgreSQL `\i` directive to include files in the proper order. 