import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, gameMode, steps, email } = body;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Log the bug report (you can hook this up to email, Discord, GitHub, etc.)
    console.log('=== BUG REPORT SUBMITTED ===');
    console.log(`Title: ${title}`);
    console.log(`Game Mode: ${gameMode || 'Not specified'}`);
    console.log(`Description: ${description}`);
    if (steps) console.log(`Steps: ${steps}`);
    if (email) console.log(`Contact: ${email}`);
    console.log(`Submitted: ${new Date().toISOString()}`);
    console.log('============================\n');

    // Send to webhook if configured
    if (process.env.BUG_REPORT_WEBHOOK_URL) {
      try {
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        });
        
        const gameModeEmoji = {
          'country-rank': '📊',
          'country-rank-europe': '🇪🇺',
          'hidden-country': '🗺️',
          'border-hunt': '🗺️',
          'nation-links': '🔗',
          'nation-match': '🔗',
          'country-matrix': '📋',
          'other': '🐛'
        };
        
        const emoji = gameModeEmoji[gameMode as keyof typeof gameModeEmoji] || '🐛';
        
        const discordMessage = {
          embeds: [
            {
              title: `🐛 ${title}`,
              description: description,
              color: 3447003, // Nice blue color
              fields: [
                {
                  name: `${emoji} Game Mode`,
                  value: gameMode || 'Not specified',
                  inline: true,
                },
                {
                  name: '⏰ Submitted',
                  value: formattedTime,
                  inline: true,
                },
                steps ? {
                  name: '📋 Steps to Reproduce',
                  value: steps,
                  inline: false,
                } : null,
                email ? {
                  name: '📧 Contact',
                  value: `[${email}](mailto:${email})`,
                  inline: true,
                } : null,
              ].filter(Boolean) as any[],
              footer: {
                text: 'GeoVault Bug Reports',
                icon_url: 'https://emoji.discord.st/emojis/gavi-yay.png',
              },
            },
          ],
        };
        
        await fetch(process.env.BUG_REPORT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordMessage),
        });
      } catch (webhookError) {
        console.error('Failed to send webhook:', webhookError);
        // Don't fail the request if webhook fails - still accept the bug report
      }
    }

    return NextResponse.json(
      { message: 'Bug report received. Thank you!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Bug report error:', error);
    return NextResponse.json(
      { error: 'Failed to process bug report' },
      { status: 500 }
    );
  }
}
