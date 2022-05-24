// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import chromium from 'chrome-aws-lambda';
import pw from 'playwright-core';
import { z, ZodError } from "zod";

const expectedBody = z.object({
	divisionName: z.string(),
	formattedDate: z.string().optional(),
	matchNumber: z.string().optional(),
	fieldName: z.string().optional(),
	currentTeamName: z.string(),
	homeTeamName: z.string().optional(),
	awayTeamName: z.string().optional(),
	teamPlayers: z.array(
		z.object({
			first_name: z.string(),
			last_name: z.string(),
			reserve: z.boolean(),
		})
	)
})

type ExpectedBody = z.infer<typeof expectedBody>;

const generatePdf = async (html = '') => {
	const options = process.env.AWS_REGION
		? {
				args: chromium.args,
				executablePath: await chromium.executablePath,
				headless: chromium.headless,
		  }
		: {
				args: [],
				executablePath:
					process.platform === 'win32'
						? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
						: process.platform === 'linux'
						? '/usr/bin/google-chrome'
						: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		  };

	const browser = await pw.chromium.launch(options);
	const page = await browser.newPage();

	await page.setContent(html);

	const pdfBuffer = await page.pdf({
		format: 'letter',
		pageRanges: '1',
	});

	await page.close();
	await browser.close();

	return pdfBuffer;
};

export const generateMatchCardPdf = async ({
	divisionName,
	formattedDate,
	matchNumber,
	fieldName,
	currentTeamName,
	homeTeamName,
	awayTeamName,
	teamPlayers,
}: {
	divisionName: string;
	formattedDate?: string;
	matchNumber?: string;
	fieldName?: string;
	currentTeamName: string;
	homeTeamName?: string;
	awayTeamName?: string;
	teamPlayers: {
		first_name: string
		last_name: string
		reserve: boolean
	}[];
}): Promise<Buffer> => {
	const playerRows: { number?: string; name?: string; reserve?: boolean }[] = [];
	// Need to fill up 25 player rows in the match card
	for (let i = 0; i < 25; i++) {
		const player = teamPlayers[i];
		if (player) {
			playerRows.push({
				name: `${player.last_name}, ${player.first_name}`,
				reserve: player.reserve,
			});
		} else {
			playerRows.push({});
		}
	}
	const html = `
  <html>
    <head>
      <title>Match card - ${currentTeamName}</title>
      <style>
      * {
      font-family: sans-serif;
      box-sizing: border-box;
    }
    
    body {
      width: 8.5in;
      height: 11in;
      padding: 5mm 5mm;
    }
    
    .matchCard {
      display: flex;
      flex-direction: column;
      height: 100%;
      border-top: 1px solid black;
      border-left: 1px solid black;
    }
    
    .title {
      justify-content: center;
    }
    
    .row {
      display: flex;
      width: 100%;
      height: 1.8rem;
      flex-shrink: 0;
    }
    
    .playerRow {
      display: flex;
      width: 100%;
      height: 1.5rem;
      flex-shrink: 0;
    }
    
    .refs .row {
      height: 1.5rem;
    }
    
    .horizontalPair {
      display: flex;
    }
    
    .emphasize {
      font-weight: 600;
    }
    
    .cell {
      display: flex;
      align-items: center;
      padding: 0.25rem;
      border-right: 1px solid black;
      border-bottom: 1px solid black;
      flex-grow: 1;
    }
    
    .cell.fixed {
      flex-grow: 0;
    }
    
    .refAndLegend {
      display: flex;
    }
    
    .refs {
      flex-grow: 1;
    }
    
    .legend {
      padding: 0.25rem;
      border-right: 1px solid black;
      border-bottom: 1px solid black;
      height: calc(3 * 1.5rem);
    }
    
    .legend > p {
      margin-top: 0;
      margin-bottom: 0.125rem;
    }
    
    .observations {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    
      </style>
    </head>
    <body>
      <div class="matchCard">
      <div class="row">
      <div class="cell title">
        Carte de match -&nbsp;<span class="emphasize">${currentTeamName}</span>
      </div>
    </div>
        <div class="row">
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed" style="width: 6rem">
              Division
            </div>
            <div class="cell emphasize">
              ${divisionName}
            </div>
          </div>
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed" style="width: 6rem">
              Date
            </div>
            <div class="cell emphasize">
              ${formattedDate}
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed" style="width: 6rem">
              Match
            </div>
            <div class="cell emphasize">
              ${matchNumber}
            </div>
          </div>
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed" style="width: 6rem">
              Terrain
            </div>
            <div class="cell emphasize">
              ${fieldName}
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 70%">
            <div class="cell fixed" style="width: 10rem">
              Visiteur
            </div>
            <div class="cell">
              ${awayTeamName}
            </div>
          </div>
          <div class="horizontalPair" style="width: 30%">
            <div class="cell fixed" style="width: 8rem">
              Pointage
            </div>
            <div class="cell">
      
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 70%">
            <div class="cell fixed" style="width: 10rem">
              Receveur
            </div>
            <div class="cell">
              ${homeTeamName}
            </div>
          </div>
          <div class="horizontalPair" style="width: 30%">
            <div class="cell fixed" style="width: 8rem">
              Pointage
            </div>
            <div class="cell emphasize">
      
            </div>
          </div>
        </div>
        <div class="playerRow"> 
          <div class="cell fixed" style="width: 4.5rem">Présent</div>
          <div class="cell fixed" style="width: 3rem">No</div>
          <div class="cell">Nom</div>
          <div class="cell fixed" style="width: 3rem">A/E</div>
          <div class="cell fixed" style="width: 3rem">Buts</div>
          <div class="cell fixed" style="width: 3rem">R</div>
        </div>
        ${playerRows
					.map((player) => {
						return `
            <div class="playerRow">
          <div class="cell fixed" style="width: 4.5rem"></div>
          <div class="cell fixed" style="width: 3rem">${player.number ?? ''}</div>
          <div class="cell">${player.name ?? ''}</div>
          <div class="cell fixed" style="width: 3rem"></div>
          <div class="cell fixed" style="width: 3rem"></div>
          <div class="cell fixed" style="width: 3rem">${player.reserve ? 'Oui' : ''}</div>
        </div>
          `;
					})
					.join('\n')}
        
        
        <div class="refAndLegend">
          <div class="refs">
            <div class="row">
              <div class="cell fixed" style="width: 10rem">
                Arbitre
              </div>
              <div class="cell">
      
              </div>
            </div>
            <div class="row">
              <div class="cell fixed" style="width: 10rem">
                Arbitre Assistant
              </div>
              <div class="cell">
      
              </div>
            </div>
            <div class="row">
              <div class="cell fixed" style="width: 10rem">
                Arbitre Assistant
              </div>
              <div class="cell">
      
              </div>
            </div>
          </div>
          <div class="legend">
            <p>A - Avertissement</p>
            <p>E - Expulsion</p>
            <p>R - Réserviste</p>
          </div>
        </div>
        <div class="observations">
          <div class="row">
            <div class="cell" style="width: 50%; justify-content: center">
              Observations de l'arbitres
            </div>
            <div class="cell" style="width: 50%; justify-content: center">
              Observations de l'entraîneur
            </div>
          </div>
          <div class="remainingHeightRow" style="display: flex; flex-grow: 1;">
            <div class="cell"></div>
            <div class="cell"></div>
          </div>
        </div>
      </div>
    </body>
  </html>
`;
	return generatePdf(html);
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | 	Buffer>
) {
	console.log('body', req.body)
	try {
		const parsedBody = expectedBody.parse(req.body);
		const pdf = await generateMatchCardPdf(parsedBody);
		res.setHeader('Content-Type', 'application/pdf')
		res.send(pdf);
		return;
	} catch (e) {
		if (e instanceof ZodError) {
			res.status(400).json("Unexpected body");
		} else {
			res.status(400).json("Something went wrong");
		}
		return;
	}
}
