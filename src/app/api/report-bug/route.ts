import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const gameMode = formData.get('gameMode') as string;
    const email = formData.get('email') as string;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Collect images
    const images: { name: string; data: string }[] = [];
    let imageIndex = 0;
    while (formData.has(`image_${imageIndex}`)) {
      const imageData = formData.get(`image_${imageIndex}`) as string;
      images.push({ 
        name: `screenshot_${imageIndex}.png`, 
        data: imageData 
      });
      imageIndex++;
    }

    // Log the bug report
    console.log('=== BUG REPORT SUBMITTED ===');
    console.log(`Title: ${title}`);
    console.log(`Game Mode: ${gameMode || 'Not specified'}`);
    console.log(`Description: ${description}`);
    if (email) console.log(`Contact: ${email}`);
    console.log(`Images: ${images.length}`);
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
        
        // Build copy-friendly text report
        const copyableReport = `**BUG REPORT**
Title: ${title}
Description: ${description}
Game Mode: ${gameMode || 'Not specified'}
Contact: ${email || 'Not provided'}
Submitted: ${formattedTime}`;
        
        const discordMessage: any = {
          content: `\`\`\`\n${copyableReport}\n\`\`\``,
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
                email ? {
                  name: '📧 Contact',
                  value: `[${email}](mailto:${email})`,
                  inline: true,
                } : null,
                images.length > 0 ? {
                  name: '🖼️ Screenshots',
                  value: `${images.length} image${images.length > 1 ? 's' : ''} attached`,
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

        // If there are images, add embed with first image
        if (images.length > 0) {
          discordMessage.embeds[0].image = {
            url: images[0].data, // base64 data URL
          };
        }
        
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
