interface Property {
    latitude: number;
    longitude: number;
}

interface AddressData {
    items: Property[];
}

interface RelatedPropertiesData {
    items: Property[];
}

class NeighborhoodPropertiesCalculator {
    private addressData: AddressData;
    private relatedPropertiesData: RelatedPropertiesData;

    constructor(addressData: AddressData, relatedPropertiesData: RelatedPropertiesData) {
        this.addressData = addressData;
        this.relatedPropertiesData = relatedPropertiesData;
    }

    calculateNeighborhoodProperties(radiusMiles: number = 0.75): Property[] {
        if (!this.addressData.items || this.addressData.items.length === 0 || !this.relatedPropertiesData.items) {
            return [];
        }

        const { latitude: originLat, longitude: originLon } = this.addressData.items[0];

        const neighborhoodProperties = this.relatedPropertiesData.items.filter(property => {
            if (property.latitude === originLat && property.longitude === originLon) {
                return false;
            }

            const distance = this.calculateDistance(
                originLat,
                originLon,
                property.latitude,
                property.longitude
            );
            return distance <= radiusMiles;
        });

        return neighborhoodProperties;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const earthRadiusMiles = 3958.8;

        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLon = this.degreesToRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(this.degreesToRadians(lat1)) *
            Math.cos(this.degreesToRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusMiles * c;
    }

    private degreesToRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
}

export default NeighborhoodPropertiesCalculator;
