-- Market Calculation Reference Table
CREATE TABLE IF NOT EXISTS market_calculation_reference (
    id SERIAL PRIMARY KEY,
    debt_service_coverage_ratio DECIMAL(5,2) DEFAULT 1.20,
    interest_rate DECIMAL(5,3) DEFAULT 7.000,
    amortization_period INT DEFAULT 30,
    total_closing_holding_costs DECIMAL(5,2) DEFAULT 4.00,
    equity_return_percentage DECIMAL(5,2) DEFAULT 80.00,
    loan_to_value DECIMAL(5,2) DEFAULT 75.00,
    margin_percentage DECIMAL(5,2) DEFAULT 20.00,
    bridge_loan_percentage DECIMAL(5,2) DEFAULT 80.00,
    down_payment_percentage DECIMAL(5,2) DEFAULT 20.00,
    operating_expense_percentage DECIMAL(5,2) DEFAULT 35.00,
    commission_rate DECIMAL(5,2) DEFAULT 6.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_market_calculation_reference_updated_at
BEFORE UPDATE ON market_calculation_reference
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 
