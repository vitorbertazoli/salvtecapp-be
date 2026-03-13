interface AddressLike {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface AccountLike {
  name?: string;
  logoUrl?: string;
  replyToEmail?: string;
  email?: string;
  phoneNumbers?: string[] | string;
  phoneNumber?: string;
}

interface CustomerLike {
  name?: string;
  email?: string;
  phoneNumbers?: string[] | string;
  phoneNumber?: string;
  address?: AddressLike;
  type?: string;
  cpf?: string;
  cnpj?: string;
  contactName?: string;
}

interface ServiceLike {
  service?: {
    name?: string;
    description?: string;
  };
  quantity?: number;
  unitValue?: number;
}

interface CompanyHeaderOptions {
  account: AccountLike;
  title: string;
  frontendUrl: string;
}

interface ServicesSectionOptions {
  sectionTitle?: string;
  emptyMessage?: string;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function toText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return '';
}

export function escapeHtml(value: unknown): string {
  const text = toText(value);
  if (!text) {
    return '';
  }

  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

export function formatCurrencyBRL(value: unknown): string {
  const numeric = Number(value);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDatePtBr(value: unknown, includeTime: boolean = false): string {
  if (!value) {
    return '-';
  }

  const parsedDate = new Date(value as string | number | Date);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }
      : {
          // Date-only values in the system are stored as UTC midnight; keep UTC
          // during formatting to avoid timezone day shifts in emails.
          timeZone: 'UTC'
        })
  }).format(parsedDate);
}

export function formatMultilineText(value: unknown): string {
  if (!value) {
    return 'Nao informado';
  }

  const safeText = escapeHtml(value).trim();
  return safeText ? safeText.replace(/\n/g, '<br>') : 'Nao informado';
}

export function resolvePublicAssetUrl(assetUrl: unknown, frontendUrl: string): string | null {
  if (!assetUrl || typeof assetUrl !== 'string') {
    return null;
  }

  if (/^https?:\/\//i.test(assetUrl)) {
    return assetUrl;
  }

  const normalizedBase = frontendUrl.replace(/\/$/, '');
  const normalizedPath = assetUrl.startsWith('/') ? assetUrl : `/${assetUrl}`;

  return `${normalizedBase}${normalizedPath}`;
}

function normalizePhoneNumbers(phoneNumbers: unknown, singlePhone?: unknown): string[] {
  const normalized = new Set<string>();

  if (Array.isArray(phoneNumbers)) {
    phoneNumbers.forEach((phone) => {
      if (phone) {
        normalized.add(String(phone).trim());
      }
    });
  } else if (typeof phoneNumbers === 'string' && phoneNumbers.trim()) {
    normalized.add(phoneNumbers.trim());
  }

  if (typeof singlePhone === 'string' && singlePhone.trim()) {
    normalized.add(singlePhone.trim());
  }

  return Array.from(normalized).filter(Boolean);
}

function renderInfoItem(label: string, value: unknown, fallback: string = 'Nao informado'): string {
  const valueText = toText(value).trim();
  const hasValue = valueText !== '';
  const displayValue = hasValue ? escapeHtml(value) : fallback;

  return `
    <div class="info-item">
      <div class="info-label">${escapeHtml(label)}:</div>
      <div class="info-value">${displayValue}</div>
    </div>
  `;
}

function renderAddress(address: AddressLike | undefined): string {
  if (!address) {
    return 'Nao informado';
  }

  const firstLine = [address.street, address.number].filter(Boolean).join(', ');
  const secondLine = address.complement || '';
  const thirdLine = [address.neighborhood, address.city, address.state].filter(Boolean).join(' - ');
  const fourthLine = address.zipCode ? `CEP: ${address.zipCode}` : '';
  const fifthLine = address.country && address.country !== 'Brazil' ? address.country : '';

  const lines = [firstLine, secondLine, thirdLine, fourthLine, fifthLine].filter((line) => line && line.trim() !== '');

  if (lines.length === 0) {
    return 'Nao informado';
  }

  return lines.map((line) => escapeHtml(line)).join('<br>');
}

function getCustomerTypeLabel(customerType: string | undefined): string {
  if (customerType === 'residential') {
    return 'Residencial';
  }

  if (customerType === 'commercial') {
    return 'Comercial';
  }

  return 'Nao informado';
}

export function renderCompanyHeader({ account, title, frontendUrl }: CompanyHeaderOptions): string {
  const logoUrl = resolvePublicAssetUrl(account?.logoUrl, frontendUrl);

  return `
    <div class="header">
      ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo ${escapeHtml(account?.name || 'Empresa')}" />` : ''}
      <h1 class="company-name">${escapeHtml(account?.name || 'Empresa')}</h1>
      <h2 class="quote-title">${escapeHtml(title)}</h2>
    </div>
  `;
}

export function renderAccountInformationSection(account: AccountLike): string {
  const contactEmail = account?.replyToEmail || account?.email;
  const phoneNumbers = normalizePhoneNumbers(account?.phoneNumbers, account?.phoneNumber);

  return `
    <div class="section">
      <h3 class="section-title">Informacoes da Empresa</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 100%; vertical-align: top;">
            ${renderInfoItem('Empresa', account?.name)}
            ${renderInfoItem('Email', contactEmail)}
            ${renderInfoItem('Telefones', phoneNumbers.length ? phoneNumbers.join(', ') : '')}
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function renderCustomerInformationSection(customer: CustomerLike): string {
  const phoneNumbers = normalizePhoneNumbers(customer?.phoneNumbers, customer?.phoneNumber);

  return `
    <div class="section">
      <h3 class="section-title">Informacoes do Cliente</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 48%; vertical-align: top; padding-right: 20px;">
            ${renderInfoItem('Nome', customer?.name)}
            ${renderInfoItem('Email', customer?.email)}
            ${renderInfoItem('Nome do Contato', customer?.contactName)}
            ${renderInfoItem('Tipo', getCustomerTypeLabel(customer?.type))}
            ${renderInfoItem('CPF', customer?.cpf)}
            ${renderInfoItem('CNPJ', customer?.cnpj)}
            ${renderInfoItem('Telefones', phoneNumbers.length ? phoneNumbers.join(', ') : '')}
          </td>
          <td style="width: 48%; vertical-align: top; padding-left: 20px;">
            <div class="info-item">
              <div class="info-label">Endereco:</div>
              <div class="info-value">${renderAddress(customer?.address)}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function renderServicesTableSection(services: ServiceLike[] = [], options?: ServicesSectionOptions): string {
  const sectionTitle = options?.sectionTitle || 'Servicos';
  const emptyMessage = options?.emptyMessage || 'Nenhum servico informado.';

  if (!services || services.length === 0) {
    return `
      <div class="section">
        <h3 class="section-title">${escapeHtml(sectionTitle)}</h3>
        <div class="info-value">${escapeHtml(emptyMessage)}</div>
      </div>
    `;
  }

  return `
    <div class="section">
      <h3 class="section-title">${escapeHtml(sectionTitle)}</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Servico</th>
            <th>Descricao</th>
            <th>Quantidade</th>
            <th>Valor Unitario</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${services
            .map((serviceItem) => {
              const quantity = Number(serviceItem?.quantity || 0);
              const unitValue = Number(serviceItem?.unitValue || 0);
              const total = quantity * unitValue;

              return `
                <tr>
                  <td>${escapeHtml(serviceItem?.service?.name || 'Servico')}</td>
                  <td>${escapeHtml(serviceItem?.service?.description || '-')}</td>
                  <td>${escapeHtml(quantity)}</td>
                  <td>${formatCurrencyBRL(unitValue)}</td>
                  <td>${formatCurrencyBRL(total)}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}
