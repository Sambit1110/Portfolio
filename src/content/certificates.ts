// Certificates hang as framed banners along the milestone path: one frame per
// entry. While the list is empty, the path shows three blank frames and the
// certificates section is left out of panels and the HTML page.
//
// Example entry:
// {
//   id: "example-cert",
//   name: "Certificate name",
//   issuer: "Issuing organisation",
//   date: "Month Year",
//   credentialId: "ABC-123",
//   description: "One or two sentences about what it covers.",
// },

export type Certificate = {
  id: string;
  name: string;
  issuer: string;
  date?: string;
  credentialId?: string;
  description?: string;
};

export const CERTIFICATES: Certificate[] = [];
