export class Property {
    etlNr: number;
    parclPropertyId: number;
    investorCompany?: string | null;
    address: string;
    city: string;
    stateAbbreviation: string;
    county: string;
    zipCode: string;
    bathrooms: number;
    bedrooms: number;
    squareFootage: number;
    yearBuilt: number;
    latitude: number;
    longitude: number;

    constructor(
        etlNr: number,
        parclPropertyId: number,
        address: string,
        city: string,
        stateAbbreviation: string,
        county: string,
        zipCode: string,
        bathrooms: number,
        bedrooms: number,
        squareFootage: number,
        yearBuilt: number,
        latitude: number,
        longitude: number,
        investorCompany?: string
    ) {
        this.etlNr = etlNr;
        this.parclPropertyId = parclPropertyId;
        this.address = address;
        this.city = city;
        this.stateAbbreviation = stateAbbreviation;
        this.county = county;
        this.zipCode = zipCode;
        this.bathrooms = bathrooms;
        this.bedrooms = bedrooms;
        this.squareFootage = squareFootage;
        this.yearBuilt = yearBuilt;
        this.latitude = latitude;
        this.longitude = longitude;
        this.investorCompany = investorCompany || null;
    }
}
