import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Sheet URL is required' }, { status: 400 });
    }

    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
    }

    const sheetId = match[1];
    const sourceUrl = new URL(url);
    const gid = sourceUrl.searchParams.get('gid');

    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/export`);
    exportUrl.searchParams.set('format', 'csv');
    if (gid) exportUrl.searchParams.set('gid', gid);

    const sheetResponse = await fetch(exportUrl.toString(), { redirect: 'follow' });
    if (!sheetResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sheet. Make sure it is publicly viewable.' },
        { status: 502 }
      );
    }

    const csv = await sheetResponse.text();
    return NextResponse.json({ csv });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch sheet' },
      { status: 500 }
    );
  }
}
