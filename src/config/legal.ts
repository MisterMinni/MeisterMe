function env(name: keyof ImportMetaEnv) {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export const legalConfig = {
  operatorName: env("VITE_LEGAL_OPERATOR_NAME") ?? "Bastian Minnich",
  legalForm: env("VITE_LEGAL_FORM") ?? "Gewerbe",
  representative: env("VITE_LEGAL_REPRESENTATIVE"),
  street: env("VITE_LEGAL_STREET") ?? "Bornheimer Str. 33A",
  postalCode: env("VITE_LEGAL_POSTAL_CODE") ?? "53111",
  city: env("VITE_LEGAL_CITY") ?? "Bonn",
  email: env("VITE_LEGAL_EMAIL") ?? "b.minnich@msoftware-ag.de",
  phone: env("VITE_LEGAL_PHONE") ?? "+49 176 62838195",
  registerCourt: env("VITE_LEGAL_REGISTER_COURT"),
  registerNumber: env("VITE_LEGAL_REGISTER_NUMBER"),
  vatId: env("VITE_LEGAL_VAT_ID"),
  contentResponsible: env("VITE_LEGAL_CONTENT_RESPONSIBLE"),
  privacyEmail: env("VITE_PRIVACY_EMAIL") ?? env("VITE_LEGAL_EMAIL") ?? "b.minnich@msoftware-ag.de",
};

export const legalCoreComplete = Boolean(
  legalConfig.operatorName &&
    legalConfig.street &&
    legalConfig.postalCode &&
    legalConfig.city &&
    legalConfig.email,
);
