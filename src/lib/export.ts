import type { VimeoVideo } from './vimeo';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export interface PlaylistItem {
  id: string; // Vimeo ID (último segmento do uri)
  video: VimeoVideo;
  addedAt: number;
}

function getVideoId(video: VimeoVideo): string {
  try {
    return video.uri.split('/').pop() || video.uri;
  } catch {
    return video.uri;
  }
}

function normalizePlaylist(items: (PlaylistItem | VimeoVideo)[]): PlaylistItem[] {
  return items.map((item) => {
    if ((item as PlaylistItem).video) return item as PlaylistItem;
    const v = item as VimeoVideo;
    return { id: getVideoId(v), video: v, addedAt: Date.now() };
  });
}

export function exportPlaylistToXLSX(options: {
  items: (PlaylistItem | VimeoVideo)[];
  clientPNumber: string;
  clientName: string;
  fileName?: string;
}) {
  const { items, clientPNumber, clientName, fileName } = options;
  const normalized = normalizePlaylist(items);

  const data = normalized.map(({ id, video }) => ({
    ID: id,
    Titulo: video.name,
    Descricao: video.description || '',
    DuracaoSeg: video.duration,
    DataCriacao: new Date(video.created_time).toLocaleDateString('pt-BR'),
    Status: video.status,
    Privacidade: video.privacy?.view,
    Link: video.link,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Ocultar colunas conforme solicitado:
  // A: ID, C: Descricao, E: DataCriacao, F: Status, G: Privacidade
  // Manter visíveis: B: Titulo, D: DuracaoSeg, H: Link
  ws['!cols'] = [
    { hidden: true },   // A - ID
    { hidden: false },  // B - Titulo
    { hidden: true },   // C - Descricao
    { hidden: false },  // D - DuracaoSeg
    { hidden: true },   // E - DataCriacao
    { hidden: true },   // F - Status
    { hidden: true },   // G - Privacidade
    { hidden: false },  // H - Link
  ];

  // Ajuste opcional de largura das colunas visíveis para melhor leitura
  // (mantém as mesmas posições definidas acima)
  ws['!cols'][1].wch = 60; // Titulo
  ws['!cols'][3].wch = 12; // DuracaoSeg
  ws['!cols'][7].wch = 48; // Link

  // Metadados na primeira aba
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Playlist');

  const meta = [
    { Campo: 'Numero P do cliente', Valor: clientPNumber },
    { Campo: 'Nome do Cliente', Valor: clientName },
    { Campo: 'Qtd de Videos', Valor: String(normalized.length) },
    { Campo: 'Gerado em', Valor: new Date().toLocaleString('pt-BR') },
  ];
  const wsMeta = XLSX.utils.json_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Metadados');

  const name = fileName || `Playlist_${clientPNumber}_${clientName}.xlsx`;
  try {
    // Preferir gerar Blob e usar file-saver para comportamento consistente em navegadores (Edge/Chrome)
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, name);
  } catch (e) {
    console.warn('[Export] Falling back to XLSX.writeFile:', e);
    XLSX.writeFile(wb, name);
  }
}

export async function exportPlaylistToDOCX(options: {
  items: (PlaylistItem | VimeoVideo)[];
  clientPNumber: string;
  clientName: string;
  fileName?: string;
}) {
  const { items, clientPNumber, clientName, fileName } = options;
  const normalized = normalizePlaylist(items);

  const title = new Paragraph({
    text: `Playlist de Vídeos`,
    heading: HeadingLevel.TITLE,
  });

  const info = new Paragraph({
    children: [
      new TextRun({ text: `Numero P do cliente: ${clientPNumber}\n`, bold: true }),
      new TextRun({ text: `Nome do Cliente: ${clientName}\n`, bold: true }),
      new TextRun({ text: `Total de vídeos: ${normalized.length}\n` }),
      new TextRun({ text: `Gerado em: ${new Date().toLocaleString('pt-BR')}` }),
    ],
  });

  const headerRow = new TableRow({
    children: ['Título', 'Duração (Segundos)', 'Link'].map(
      (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
    ),
  });

  const rows = normalized.map(({ id, video }) =>
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun(video.name || '')] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun(String(video.duration ?? ''))], alignment: AlignmentType.RIGHT })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun(video.link || '')] })] }),
      ],
    })
  );

  const table = new Table({
    rows: [headerRow, ...rows],
    width: { size: 100, type: 'pct' },
    columnWidths: [8000, 2000, 7000],
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [title, info, new Paragraph(''), table],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const name = fileName || `Playlist_${clientPNumber}_${clientName}.docx`;
  saveAs(buffer, name);
}