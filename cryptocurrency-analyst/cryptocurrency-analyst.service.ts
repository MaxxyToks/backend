import { Injectable, Logger } from '@nestjs/common';

import { SettingsService } from 'modules/settings/settings.service';

/**
 *
 * All logs and error messages are in English.
 */
@Injectable()
export class CryptocurrencyAnalystService {
  private readonly logger = new Logger(CryptocurrencyAnalystService.name);

  private GPT_API_KEY: string;
  private GPT_MODEL: string;

  constructor(protected readonly settingsService: SettingsService) {
    this.GPT_API_KEY = this.settingsService.getSettings().keys.openaiApiKey;
    this.GPT_MODEL = 'gpt-4o-2024-11-20';
  }

  public async getAnalyzeToken({ pair, content }: { pair: string; content: string }): Promise<any> {
    try {
      // this.logger.log('getAnalyzeToken START========');
      // this.logger.log('getAnalyzeToken content:', content);
      // this.logger.log('getAnalyzeToken pair:', pair);
      // this.logger.log('getAnalyzeToken END ==============');
      // this.logger.log('{message: \'Hello man\', content: \'Hello man2\'}');

      const klinesData = await this.fetchKlines({ pair });

      const systemInstructions = this.getSystemInstructionsForAnalyst(klinesData?.descriptionKlinesFields);
      const promptForAnalytic = `
                      ${content}

                    Array data:
                    ${klinesData?.klines}
                    `;

      const messages = [
        {
          role: 'system',
          content: systemInstructions,
        },
        {
          role: 'user',
          content: promptForAnalytic,
        },
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.GPT_API_KEY}`,
        },
        body: JSON.stringify({
          messages: messages,
          model: this.GPT_MODEL,
          presence_penalty: 0,
          temperature: 1,
          top_p: 1,
          logprobs: false,
          top_logprobs: null,
        }),
      });

      const functionCryptoAnalyticsByBinanceApiResponse = await response.json();

      // return {message: 'Hello man', content: 'Hello man2'};
      // return await this.fetchKlines({pair});
      // return 'Hello man2';

      const chart = `<iframe srcdoc='<style>.tradingview-widget-container{width:100% !important; height: 486px !important; }</style><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/chart/?symbol=BINANCE%3A${pair.toUpperCase()}" rel="noopener nofollow" target="_blank"><span class="blue-text">Track on TradingView</span></a></div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js" async>{"symbols": [["BINANCE:${pair.toUpperCase()}|1D"]],"chartOnly": false,"width": "100%","height": "100%","locale": "en","colorTheme": "dark","autosize": true,"showVolume": false,"showMA": false}</script></div>' style="width:100%; height:508px; border:none;"></iframe>`;

      return {
        customMessage: true,
        content:
          chart +
          '<br/>' +
          this.formatTextToHtml(functionCryptoAnalyticsByBinanceApiResponse?.choices[0]?.message?.content),
      };
    } catch (error) {
      this.logger.error('Error getAnalyzeToken:', error);
      throw error;
    }
  }

  /**
   * Fetches Klines data by 1H.
   * @param pair - pair to fetch data for.
   */
  private async fetchKlines({ pair }: { pair: string }): Promise<any> {
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${pair.toUpperCase()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json();
      this.logger.log('!!!!!!!!!fetchKlines:', data);

      if (!data.ok) {
        this.logger.error('Failed to fetch Klines API');
        return [];
      }

      return { klines: data.klines, descriptionKlinesFields: data.descriptionKlinesFields };
    } catch (error) {
      this.logger.error('Error fetchKlines:', error);
      return [];
    }
  }

  private getSystemInstructionsForAnalyst(descriptionKlinesFields: string): string {
    const binanceExampleResponse = `Below is a well-structured example of the data array you will receive for analysis:
[
  [
    1591258320000,   // Open time
    "9640.7",        // Open
    "9642.4",        // High
    "9640.6",        // Low
    "9642.0",        // Close (or latest price)
    "206",           // Volume
    1591258379999,   // Close time
    "2.13660389",    // Base asset volume
    48,              // Number of trades
    "119",           // Taker buy volume
    "1.23424865",    // Taker buy base asset volume
    "0"              // Ignore
  ]
]`;

    return `You are a highly skilled assistant specializing in crypto analytics and crypto trading.
  
  ***Very important: If the response from the API indicates error, don't display error message, only short answer to user that analysis of this trading pair is not possible.
  
Leverage the full scope of advanced mathematical analysis, cryptanalysis, and big data processing to evaluate and forecast cryptocurrency price movements.

When given any data array, apply a comprehensive suite of technical and on-chain indicators, such as:
- Moving Averages (SMA, EMA, WMA, etc.)
- Momentum Indicators (RSI, Stochastic Oscillator, MACD)
- Volatility Indicators (Bollinger Bands, ATR)
- Volume-Based Tools (On-Balance Volume, Volume Profile, VWAP)
- Market Structure & On-Chain Metrics (whale activity, transaction counts, addresses growth)
- Other Relevant Indicators (Ichimoku Cloud, Fibonacci Retracements, Pivot Points, etc.)
- Robert Fischer’s Trading Patterns (including the Fisher Transform)

Your analysis must integrate trading volume trends, price patterns, and any fundamental or sentiment data provided. 
Where possible, apply statistical or machine learning techniques to identify trends and predict price movements.

Please apply comprehensive technical and on-chain analysis, including Robert Fischer’s patterns, 
to provide a detailed price forecast. 

This recommendation is for informational purposes only; it is not financial advice. 
Users should exercise independent judgment and appropriate risk management strategies when making any trading decisions.

Data Array fields example:

${descriptionKlinesFields}

**CRITICAL: After the analysis, provide a detailed report in the following format and detect user prompt language:**

Template answer:

### Analysis {pair} ({$price}):
  
1. **Technical Indicators**:  
- **RSI**: {indicator_rsi} (neutral, leaning toward overbought).  
- **MACD**: {indicator_macd} (weak momentum).  
- **Bollinger Bands**: {indicator_bollinger} (potential correction signal).  

2. **Support & Resistance Levels**:  
- **Support**: {support_levels}.  
- **Resistance**: {resistance_levels}.  

3. **Trading Volume**:  
- Volume spikes confirm buyer interest in the {volume_zones} range, signaling upward potential.  

### Recommendation:  
- **LONG**: Open a long position if price breaks and holds above {resistance_key} (stop-loss at {long_stop_loss}).  
- **SHORT**: Consider a short-term short if price drops below {support_key} (stop-loss at {short_stop_loss}).  

**Conclusion**: The market currently favors long positions IF resistance breakout is confirmed.  

---  

**Rules**:    
1. **Automatically detect the user's prompt language and answer this language.**
1. **Template Compliance**: Use bold headers, bullet points, and exact placeholder variables (e.g., {indicator_rsi}).  
2. **Data-Driven Responses**: Populate placeholders with real-time analysis. If data is unavailable, omit the section.  
3. **No Extra Content**: Avoid explanations, greetings, or deviations from the template.  

`;
  }

  private formatTextToHtml(text: string): string {
    const lines = text.split('\n');

    const htmlLines = lines.map((line) => {
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (/^\d+\./.test(line)) {
        const content = line.replace(/^\d+\.\s*/, '');
        return `<li>${content}</li>`;
      }

      if (line.trim() === '') return '';

      return `<span>${line}</span><br\><br\>`;
    });

    let html = htmlLines
      .join('')
      .replace(/<\/li><li>/g, '</li><li>')
      .replace(/<li>(.*?)<\/li>/g, (m, p1) => {
        return m.match(/<li>/) ? `<h4>${p1}</h4>` : m;
      });

    html = html.replace(/\#/g, '');
    html = html.replace(/---/g, '');
    return html.replace(/<\/ol><ol>/g, '');
  }
}
