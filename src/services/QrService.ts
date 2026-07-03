// src/services/qr.service.ts
import QRCode from 'qrcode';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const QrService = {

  /** Génère un Data URL base64 PNG du QR Code pour l'afficher dans <img> */
  async genererDataUrl(valeur: string): Promise<string> {
    return QRCode.toDataURL(valeur, {
      width:            800,
      margin:           4,
      errorCorrectionLevel: 'H',   // Haute résistance aux dommages [F-OBJ-03]
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  },

  /** F-OBJ-03 : exporte le PNG dans les fichiers de l'app */
  async exporterPng(valeur: string, nomObjet: string): Promise<string> {
    const dataUrl = await QrService.genererDataUrl(valeur);

    // Extraire le base64 pur (sans le préfixe "data:image/png;base64,")
    const base64 = dataUrl.split(',')[1];

    const nomFichier = `LOCI_QR_${nomObjet
      .replace(/\s+/g, '_')
      .toUpperCase()}_${Date.now()}.png`;

    await Filesystem.writeFile({
      path:      nomFichier,
      data:      base64,
      directory: Directory.Documents,
    });

    return nomFichier;
  },
};