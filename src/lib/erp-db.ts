// API Gateway konfiguracija - koristi API Gateway umesto direktne SQL konekcije
const API_GATEWAY_URL = process.env.ERP_API_GATEWAY_URL || 'http://localhost:3001';
const API_KEY = process.env.ERP_API_KEY || '';
const JWT_SECRET = process.env.ERP_JWT_SECRET || '';

// Provera da li su environment varijable postavljene
if (!API_GATEWAY_URL || API_GATEWAY_URL === 'http://localhost:3001') {
  console.warn('⚠️ ERP_API_GATEWAY_URL nije postavljen u .env fajlu!');
  console.warn('⚠️ Koristi se default vrednost: http://localhost:3001');
}

if (!API_KEY) {
  console.error('❌ ERP_API_KEY nije postavljen u .env fajlu!');
  console.error('❌ API Gateway autentikacija neće raditi bez API_KEY.');
}

// Cache za JWT token
let jwtToken: string | null = null;
let tokenExpiry: number = 0;

// Funkcija za dobijanje JWT tokena
async function getJWTToken(): Promise<string> {
  // Proveri da li token postoji i nije istekao
  if (jwtToken && Date.now() < tokenExpiry) {
    return jwtToken;
  }

  // Generiši novi token
  const url = `${API_GATEWAY_URL}/api/auth/login`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: API_KEY }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get JWT token: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.token) {
      throw new Error('Invalid response from auth endpoint');
    }

    jwtToken = data.token;
    // Postavi expiry na 23 sata (malo pre nego što token stvarno istekne)
    tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);

    // jwtToken je tipa string | null, ali funkcija vraća string, pa treba provera
    if (jwtToken === null) {
      throw new Error('JWT token je null');
    }
    return jwtToken;
  } catch (error: any) {
    console.error('❌ Greška pri dobijanju JWT tokena:', error?.message ?? error);
    throw error;
  }
}

// Funkcija za HTTP zahtev ka API Gateway-u sa JWT autentikacijom
async function apiGatewayRequest(endpoint: string) {
  if (!API_KEY) {
    throw new Error('ERP_API_KEY nije postavljen u environment varijablama. Proveri .env fajl na cloud serveru.');
  }

  if (!API_GATEWAY_URL || API_GATEWAY_URL === 'http://localhost:3001') {
    throw new Error('ERP_API_GATEWAY_URL nije postavljen u .env fajlu. Postavi Tailscale IP adresu (npr. http://100.78.79.7:3001)');
  }

  const url = `${API_GATEWAY_URL}${endpoint}`;
  
  console.log(`🔌 Povezivanje sa API Gateway serverom: ${url}`);
  
  try {
    // Dobij JWT token
    const token = await getJWTToken();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`API Gateway error: ${errorData.error || response.statusText} (${response.status})`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Unknown API Gateway error');
    }

    return data;
  } catch (error: any) {
    console.error(`❌ Greška pri komunikaciji sa API Gateway-om (${url}):`, error.message);
    console.error(`❌ Proveri:`);
    console.error(`   1. Da li je ERP_API_GATEWAY_URL postavljen u .env fajlu?`);
    console.error(`   2. Da li je ERP_API_KEY postavljen i isti kao u api-gateway/.env?`);
    console.error(`   3. Da li API Gateway radi na lokalnom računaru?`);
    console.error(`   4. Da li Tailscale VPN konekcija radi?`);
    throw error;
  }
}

// Export tipova
export type ErpProduct = {
  SKU: string;
  Name: string;
  CatalogNumber?: string | null;
  Stock: number;
  Price?: number | null;
  product_id?: number;
  Skladiste?: number;
};

export type ErpClient = {
  ERP_ID: number;
  Code?: string | null;
  Name: string;
  Address?: string | null;
  City?: string | null;
  Phone?: string | null;
  Email?: string | null;
  MatBroj?: string | null;
  PdvBroj?: string | null;
  Note?: string | null;
};

export type ErpBranch = {
  ERP_ID: number;
  PartnerERP_ID: number;
  Code?: string | null;
  Name: string;
  IdBroj?: string | null;
  Address?: string | null;
  City?: string | null;
  Phone?: string | null;
  Email?: string | null;
  ContactPerson?: string | null;
  ZipCode?: string | null;
};

// Funkcije za dohvatanje podataka preko API Gateway-a
export async function getErpProducts(): Promise<ErpProduct[]> {
  const data = await apiGatewayRequest('/api/products');
  return data.products || [];
}

export async function getErpClients(): Promise<ErpClient[]> {
  const data = await apiGatewayRequest('/api/clients');
  return data.clients || [];
}

export async function getErpBranches(): Promise<ErpBranch[]> {
  const data = await apiGatewayRequest('/api/branches');
  return data.branches || [];
}

// Test konekcije
export async function testErpConnection(): Promise<boolean> {
  try {
    const data = await apiGatewayRequest('/api/test');
    return data.connected === true;
  } catch (error) {
    return false;
  }
}

// Backward compatibility - deprecated funkcije (za postojeći kod)
// @deprecated Koristite getErpProducts(), getErpClients(), getErpBranches() umesto ove funkcije
export async function getErpConnection(): Promise<any> {
  console.warn('⚠️ getErpConnection() je deprecated. Koristite getErpProducts(), getErpClients() ili getErpBranches()');
  throw new Error('getErpConnection() više nije podržana. Koristite API Gateway funkcije.');
}

export async function closeErpConnection() {
  // Nema potrebe za zatvaranjem konekcije jer koristimo HTTP zahteve
  console.log('ℹ️ closeErpConnection() više nije potrebna sa API Gateway pristupom');
}

