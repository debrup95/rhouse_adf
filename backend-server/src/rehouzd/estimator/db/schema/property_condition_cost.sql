-- Property Condition Cost Table
CREATE TABLE IF NOT EXISTS property_condition_cost (
    id SERIAL PRIMARY KEY,
    property_condition VARCHAR(50) NOT NULL,
    low_cost DECIMAL(10,2) NOT NULL,
    high_cost DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_condition ON property_condition_cost(property_condition);


CREATE TRIGGER update_property_condition_cost_updated_at
BEFORE UPDATE ON property_condition_cost
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 