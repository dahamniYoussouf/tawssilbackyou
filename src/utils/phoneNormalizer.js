/**
 * Normalise un numéro de téléphone algérien
 * Élimine le zéro après le code pays 213
 * Exemple: 2130656751444 → 213656751444
 * 
 * @param {string} phone - Numéro de téléphone à normaliser
 * @returns {string|null} - Numéro normalisé ou null si invalide
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Convertir en string et supprimer les espaces, tirets, etc.
  let normalized = String(phone).trim().replace(/[\s\-\(\)\+]/g, '');
  
  // Si vide après nettoyage, retourner null
  if (!normalized) return null;
  
  // Si le numéro commence par 2130, remplacer par 213
  // Exemple: 2130656751444 → 213656751444
  if (normalized.startsWith('2130')) {
    normalized = '213' + normalized.substring(4);
  }
  // Si le numéro commence par 0, remplacer par 213
  // Exemple: 0656751444 → 213656751444
  else if (normalized.startsWith('0')) {
    normalized = '213' + normalized.substring(1);
  }
  // Si le numéro commence déjà par 213 mais pas suivi de 0, le garder tel quel
  // Exemple: 213656751444 → 213656751444
  else if (!normalized.startsWith('213')) {
    // Si le numéro ne commence ni par 0 ni par 213, essayer d'ajouter 213
    // Exemple: 656751444 → 213656751444
    if (normalized.length >= 9) {
      normalized = '213' + normalized;
    }
  }
  
  return normalized;
}

/**
 * Normalise un numéro de téléphone et le valide
 * @param {string} phone - Numéro de téléphone à normaliser
 * @returns {string|null} - Numéro normalisé ou null si invalide
 */
export function normalizeAndValidatePhone(phone) {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) return null;
  
  // Validation: doit commencer par 213 et avoir au moins 12 chiffres (213 + 9 chiffres)
  if (!normalized.match(/^213\d{9,}$/)) {
    return null;
  }
  
  return normalized;
}

