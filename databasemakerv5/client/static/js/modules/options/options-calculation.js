/**
 * Options Calculations Module
 * Provides advanced analytics and calculations for options data
 */

let OptionsCalculation = {
  // Properties
  symbol: '',
  stockPrice: 0,
  expirationDate: '',
  optionsData: null,
  calculationResults: [],
  volatilitySurface: {},

  /**
   * Initialize the options calculations with data
   * @param {string} symbol - Stock symbol
   * @param {number} stockPrice - Current stock price
   * @param {string} expirationDate - Current expiration date
   * @param {Object} optionsData - Options data (calls and puts) for current expiration
   */
  initialize: function(symbol, stockPrice, expirationDate, optionsData) {
    this.symbol = symbol;
    this.stockPrice = stockPrice;
    this.expirationDate = expirationDate;
    this.optionsData = optionsData;

    console.log(`Options calculation initialized for ${symbol}, price: ${stockPrice}, exp: ${expirationDate}`);

    // Generate calculations
    this.performCalculations();

    // Render the results
    this.renderCalculations();
  },

  /**
   * Perform all option calculations and analytics
   */
  performCalculations: function() {
    if (!this.optionsData || !this.stockPrice) {
      console.error('Cannot perform calculations without valid data and stock price');
      return;
    }

    // Reset results array
    this.calculationResults = [];

    // Calculate days to expiration
    const daysToExpiration = this.calculateDaysToExpiration();

    // Calculate implied volatility skew
    this.calculateVolatilitySkew();

    // Find best covered calls
    this.findBestCoveredCalls();

    // Find best cash secured puts
    this.findBestCashSecuredPuts();

    // Calculate maximum pain point
    this.calculateMaxPain();

    // Perform put-call parity analysis (newly added)
    this.analyzePutCallParity();

    // Find potential arbitrage opportunities
    this.findArbitrageOpportunities();

    // Calculate put-call ratio
    this.calculatePutCallRatio();

    // Find high volume/OI options
    this.findHighVolumeOptions();

    // Calculate options summary stats
    this.calculateSummaryStats();
  },

  /**
   * Calculate days to expiration
   * @returns {number} - Days to expiration
   */
  calculateDaysToExpiration: function() {
    const expDate = new Date(this.expirationDate);
    const today = new Date();

    // Calculate difference in days
    const diffTime = Math.abs(expDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Store this for other calculations
    this.daysToExpiration = diffDays;

    // Add to results
    this.calculationResults.push({
      type: 'basicInfo',
      title: 'Expiration Information',
      data: [
        { label: 'Days to Expiration', value: diffDays },
        { label: 'Annual Factor', value: (365 / diffDays).toFixed(2) }
      ]
    });

    return diffDays;
  },

  /**
   * Calculate implied volatility skew
   */
  calculateVolatilitySkew: function() {
    const calls = this.optionsData.calls;
    const puts = this.optionsData.puts;

    if (!calls.length || !puts.length) return;

    // Get calls and puts with valid IV data
    const callsWithIV = calls.filter(call => call.implied_volatility && call.implied_volatility > 0);
    const putsWithIV = puts.filter(put => put.implied_volatility && put.implied_volatility > 0);

    if (!callsWithIV.length || !putsWithIV.length) {
      console.log('Not enough IV data to calculate skew');
      return;
    }

    // Find ATM strikes (closest to stock price)
    const atmCallStrike = this.findClosestStrike(callsWithIV, this.stockPrice);
    const atmPutStrike = this.findClosestStrike(putsWithIV, this.stockPrice);

    // Find OTM calls and puts
    const otmCalls = callsWithIV.filter(call =>
      parseFloat(call.strike_price) > this.stockPrice &&
      parseFloat(call.strike_price) <= this.stockPrice * 1.2 // Up to 20% OTM
    );

    const otmPuts = putsWithIV.filter(put =>
      parseFloat(put.strike_price) < this.stockPrice &&
      parseFloat(put.strike_price) >= this.stockPrice * 0.8 // Up to 20% OTM
    );

    // Calculate average IV for ATM
    const atmCall = callsWithIV.find(call => parseFloat(call.strike_price) === atmCallStrike);
    const atmPut = putsWithIV.find(put => parseFloat(put.strike_price) === atmPutStrike);

    const atmIV = atmCall && atmPut ?
      (parseFloat(atmCall.implied_volatility) + parseFloat(atmPut.implied_volatility)) / 2 :
      (atmCall ? parseFloat(atmCall.implied_volatility) : parseFloat(atmPut.implied_volatility));

    // Calculate average IV for OTM calls and puts
    const avgOtmCallIV = otmCalls.length ?
      otmCalls.reduce((sum, call) => sum + parseFloat(call.implied_volatility), 0) / otmCalls.length : 0;

    const avgOtmPutIV = otmPuts.length ?
      otmPuts.reduce((sum, put) => sum + parseFloat(put.implied_volatility), 0) / otmPuts.length : 0;

    // Calculate skew (difference between OTM puts and OTM calls)
    const volatilitySkew = avgOtmPutIV - avgOtmCallIV;

    // Store skew data
    this.volatilitySurface = {
      atmIV: atmIV,
      avgOtmCallIV: avgOtmCallIV,
      avgOtmPutIV: avgOtmPutIV,
      skew: volatilitySkew
    };

    // Add to results
    this.calculationResults.push({
      type: 'volatilitySkew',
      title: 'Volatility Analysis',
      data: [
        { label: 'ATM Implied Volatility', value: (atmIV * 100).toFixed(2) + '%', tooltip: 'Average implied volatility of options at or near the current stock price' },
        { label: 'OTM Calls Average IV', value: (avgOtmCallIV * 100).toFixed(2) + '%', tooltip: 'Average IV of out-of-the-money calls (up to 20% above current price)' },
        { label: 'OTM Puts Average IV', value: (avgOtmPutIV * 100).toFixed(2) + '%', tooltip: 'Average IV of out-of-the-money puts (up to 20% below current price)' },
        { label: 'Volatility Skew', value: (volatilitySkew * 100).toFixed(2) + '%', tooltip: 'Difference between OTM put and call IV (positive means downside protection is more expensive)' },
        { label: 'IV Interpretation', value: this.interpretVolatilitySkew(volatilitySkew, atmIV), special: true }
      ]
    });
  },

  /**
   * Interpret volatility skew
   * @param {number} skew - Volatility skew value
   * @param {number} atmIV - At-the-money implied volatility
   * @returns {string} - Interpretation of the volatility skew
   */
  interpretVolatilitySkew: function(skew, atmIV) {
    if (skew > 0.1) {
      return 'Strong bearish sentiment - significantly more expensive downside protection';
    } else if (skew > 0.05) {
      return 'Moderate bearish sentiment - more expensive downside protection';
    } else if (skew > 0.02) {
      return 'Slight bearish sentiment - somewhat more expensive downside protection';
    } else if (skew < -0.1) {
      return 'Strong bullish sentiment - upside calls relatively expensive';
    } else if (skew < -0.05) {
      return 'Moderate bullish sentiment - upside calls more expensive';
    } else if (skew < -0.02) {
      return 'Slight bullish sentiment - upside calls somewhat more expensive';
    } else {
      return 'Neutral sentiment - similar pricing for upside and downside options';
    }
  },

  /**
   * Find best covered call opportunities
   */
  findBestCoveredCalls: function() {
    const calls = this.optionsData.calls;

    if (!calls.length) return;

    // Get calls where strike is above current price (OTM calls)
    const otmCalls = calls.filter(call =>
      parseFloat(call.strike_price) > this.stockPrice &&
      call.bid > 0 &&
      call.open_interest > 10 // Only consider calls with some open interest
    );

    if (!otmCalls.length) {
      console.log('No suitable calls for covered call strategy');
      return;
    }

    // Calculate return metrics for each call
    const coveredCallData = otmCalls.map(call => {
      const strike = parseFloat(call.strike_price);
      const premium = parseFloat(call.bid); // Use bid price (what you can sell for)

      // Calculate static return (premium / stock price)
      const staticReturn = premium / this.stockPrice;

      // Calculate if assigned return ((strike - stock price + premium) / stock price)
      const assignedReturn = (strike - this.stockPrice + premium) / this.stockPrice;

      // Annualized returns
      const annualFactor = 365 / this.daysToExpiration;
      const annualizedStaticReturn = staticReturn * annualFactor;
      const annualizedAssignedReturn = assignedReturn * annualFactor;

      // Return data for this call
      return {
        strike: strike,
        premium: premium,
        staticReturn: staticReturn,
        assignedReturn: assignedReturn,
        annualizedStaticReturn: annualizedStaticReturn,
        annualizedAssignedReturn: annualizedAssignedReturn,
        daysToExpiration: this.daysToExpiration,
        originalOption: call
      };
    });

    // Sort by annualized static return (premium yield)
    const sortedByStaticReturn = [...coveredCallData].sort((a, b) =>
      b.annualizedStaticReturn - a.annualizedStaticReturn
    );

    // Get top 5 by static return
    const topStaticReturns = sortedByStaticReturn.slice(0, 5);

    // Sort by annualized assigned return
    const sortedByAssignedReturn = [...coveredCallData].sort((a, b) =>
      b.annualizedAssignedReturn - a.annualizedAssignedReturn
    );

    // Get top 5 by assigned return
    const topAssignedReturns = sortedByAssignedReturn.slice(0, 5);

    // Pick the best opportunity overall (weighted score)
    const bestOverall = coveredCallData.map(callData => {
      // Higher weight for static return for shorter expirations
      const weight = Math.min(1, this.daysToExpiration / 30);
      const weightedScore = (callData.annualizedStaticReturn * (1-weight)) +
                           (callData.annualizedAssignedReturn * weight);
      return { ...callData, weightedScore };
    }).sort((a, b) => b.weightedScore - a.weightedScore)[0];

    // Add to results
    this.calculationResults.push({
      type: 'coveredCalls',
      title: 'Best Covered Call Opportunities',
      best: bestOverall,
      data: [
        {
          label: 'Highest Premium Yield',
          value: `$${topStaticReturns[0].strike} strike: ${(topStaticReturns[0].annualizedStaticReturn * 100).toFixed(2)}% annualized`,
          tooltip: `Collect $${topStaticReturns[0].premium.toFixed(2)} premium (${(topStaticReturns[0].staticReturn * 100).toFixed(2)}% yield)`
        },
        {
          label: 'Highest If Assigned Return',
          value: `$${topAssignedReturns[0].strike} strike: ${(topAssignedReturns[0].annualizedAssignedReturn * 100).toFixed(2)}% annualized`,
          tooltip: `Potential ${(topAssignedReturns[0].assignedReturn * 100).toFixed(2)}% return if assigned`
        },
        {
          label: 'Best Overall Opportunity',
          value: `$${bestOverall.strike} strike - ${this.daysToExpiration} DTE`,
          tooltip: `${(bestOverall.annualizedStaticReturn * 100).toFixed(2)}% static / ${(bestOverall.annualizedAssignedReturn * 100).toFixed(2)}% if assigned (annualized)`
        }
      ]
    });
  },

  /**
   * Find best cash secured put opportunities
   */
  findBestCashSecuredPuts: function() {
    const puts = this.optionsData.puts;

    if (!puts.length) return;

    // Get puts where strike is below current price (OTM puts)
    const otmPuts = puts.filter(put =>
      parseFloat(put.strike_price) < this.stockPrice &&
      put.bid > 0 &&
      put.open_interest > 10 // Only consider puts with some open interest
    );

    if (!otmPuts.length) {
      console.log('No suitable puts for cash secured put strategy');
      return;
    }

    // Calculate return metrics for each put
    const cashSecuredPutData = otmPuts.map(put => {
      const strike = parseFloat(put.strike_price);
      const premium = parseFloat(put.bid); // Use bid price (what you can sell for)

      // Calculate return on capital ((premium / strike price)
      const returnOnCapital = premium / strike;

      // Calculate discount to current price if assigned
      const discountIfAssigned = (this.stockPrice - (strike - premium)) / this.stockPrice;

      // Annualized return
      const annualFactor = 365 / this.daysToExpiration;
      const annualizedReturnOnCapital = returnOnCapital * annualFactor;

      // Return data for this put
      return {
        strike: strike,
        premium: premium,
        returnOnCapital: returnOnCapital,
        discountIfAssigned: discountIfAssigned,
        annualizedReturnOnCapital: annualizedReturnOnCapital,
        daysToExpiration: this.daysToExpiration,
        originalOption: put
      };
    });

    // Sort by annualized return on capital
    const sortedByReturn = [...cashSecuredPutData].sort((a, b) =>
      b.annualizedReturnOnCapital - a.annualizedReturnOnCapital
    );

    // Get top 5 by return on capital
    const topReturns = sortedByReturn.slice(0, 5);

    // Sort by discount if assigned
    const sortedByDiscount = [...cashSecuredPutData].sort((a, b) =>
      b.discountIfAssigned - a.discountIfAssigned
    );

    // Get top 5 by discount if assigned
    const topDiscounts = sortedByDiscount.slice(0, 5);

    // Pick the best opportunity overall (weighted score)
    const bestOverall = cashSecuredPutData.map(putData => {
      // Lower strikes get higher weights for discount
      const strikePercent = putData.strike / this.stockPrice;
      const discountWeight = Math.max(0, Math.min(1, 2 - 2 * strikePercent));
      const weightedScore = (putData.annualizedReturnOnCapital * (1-discountWeight)) +
                           (putData.discountIfAssigned * discountWeight * 5); // Scale discount importance
      return { ...putData, weightedScore };
    }).sort((a, b) => b.weightedScore - a.weightedScore)[0];

    // Add to results
    this.calculationResults.push({
      type: 'cashSecuredPuts',
      title: 'Best Cash Secured Put Opportunities',
      best: bestOverall,
      data: [
        {
          label: 'Highest Premium Return',
          value: `$${topReturns[0].strike} strike: ${(topReturns[0].annualizedReturnOnCapital * 100).toFixed(2)}% annualized`,
          tooltip: `Collect $${topReturns[0].premium.toFixed(2)} premium (${(topReturns[0].returnOnCapital * 100).toFixed(2)}% return on capital)`
        },
        {
          label: 'Largest Discount If Assigned',
          value: `$${topDiscounts[0].strike} strike: ${(topDiscounts[0].discountIfAssigned * 100).toFixed(2)}% below current price`,
          tooltip: `Effective purchase price: $${(topDiscounts[0].strike - topDiscounts[0].premium).toFixed(2)}`
        },
        {
          label: 'Best Overall Opportunity',
          value: `$${bestOverall.strike} strike - ${this.daysToExpiration} DTE`,
          tooltip: `${(bestOverall.annualizedReturnOnCapital * 100).toFixed(2)}% return, ${(bestOverall.discountIfAssigned * 100).toFixed(2)}% discount if assigned`
        }
      ]
    });
  },

  /**
   * Calculate maximum pain point
   * This is the strike price where options would cause the most financial pain to holders if expired today
   */
  calculateMaxPain: function() {
    const calls = this.optionsData.calls;
    const puts = this.optionsData.puts;

    if (!calls.length || !puts.length) return;

    // Get all strikes
    const allStrikes = [...new Set([
      ...calls.map(call => parseFloat(call.strike_price)),
      ...puts.map(put => parseFloat(put.strike_price))
    ])].sort((a, b) => a - b);

    // Calculate pain for each potential price point (strike)
    const painByStrike = allStrikes.map(testPrice => {
      let totalPain = 0;

      // Add up call pain
      calls.forEach(call => {
        const strike = parseFloat(call.strike_price);
        const openInterest = parseInt(call.open_interest) || 0;

        // Call holder pain: max(0, testPrice - strike)
        const callPain = Math.max(0, testPrice - strike) * openInterest * 100; // x100 for contract multiplier
        totalPain += callPain;
      });

      // Add up put pain
      puts.forEach(put => {
        const strike = parseFloat(put.strike_price);
        const openInterest = parseInt(put.open_interest) || 0;

        // Put holder pain: max(0, strike - testPrice)
        const putPain = Math.max(0, strike - testPrice) * openInterest * 100; // x100 for contract multiplier
        totalPain += putPain;
      });

      return { strike: testPrice, pain: totalPain };
    });

    // Find the strike with minimum pain
    const maxPainPoint = painByStrike.sort((a, b) => a.pain - b.pain)[0];

    // Calculate total option interest
    const totalCallOI = calls.reduce((sum, call) => sum + (parseInt(call.open_interest) || 0), 0);
    const totalPutOI = puts.reduce((sum, put) => sum + (parseInt(put.open_interest) || 0), 0);

    // Check if max pain is reliable (need enough open interest)
    const minRequiredOI = 100; // Arbitrary threshold
    const isReliable = (totalCallOI + totalPutOI) >= minRequiredOI;

    // Calculate how far the max pain is from current price
    const maxPainDiffPercent = ((maxPainPoint.strike - this.stockPrice) / this.stockPrice) * 100;

    // Add to results
    this.calculationResults.push({
      type: 'maxPain',
      title: 'Maximum Pain Analysis',
      data: [
        {
          label: 'Max Pain Point',
          value: `$${maxPainPoint.strike.toFixed(2)}`,
          tooltip: 'The stock price that would cause the maximum financial pain to option holders at expiration'
        },
        {
          label: 'Distance from Current Price',
          value: `${maxPainDiffPercent.toFixed(2)}%`,
          tooltip: maxPainDiffPercent > 0 ? 'Max pain is above current price' : 'Max pain is below current price'
        },
        {
          label: 'Reliability',
          value: isReliable ? 'High' : 'Low',
          tooltip: isReliable ? 'Sufficient open interest to make this a reliable indicator' : 'Low open interest makes this less reliable'
        },
        {
          label: 'Call/Put OI Ratio',
          value: totalPutOI > 0 ? (totalCallOI / totalPutOI).toFixed(2) : 'N/A',
          tooltip: `${totalCallOI.toLocaleString()} call contracts vs ${totalPutOI.toLocaleString()} put contracts in open interest`
        }
      ]
    });
  },

  /**
   * Analyze Put-Call Parity (new function)
   * Put–Call Parity equation with dividends: c + Ke^{-rT} = p + S_0 e^{-qT}
   */
  analyzePutCallParity: function() {
    const calls = this.optionsData.calls;
    const puts = this.optionsData.puts;

    if (!calls.length || !puts.length) return;

    // Estimate risk-free rate (using a reasonable approximation)
    const riskFreeRate = 0.05; // 5% annual rate, should be updated with current rates

    // Estimate dividend yield (using a placeholder value, this should come from API)
    const dividendYield = 0.02; // 2% annual dividend yield

    // Calculate time to expiration in years
    const T = this.daysToExpiration / 365;

    // Current stock price
    const S0 = this.stockPrice;

    // N(d) function (cumulative distribution function of the standard normal)
    const N = function(d) {
      let a1 = 0.254829592;
      let a2 = -0.284496736;
      let a3 = 1.421413741;
      let a4 = -1.453152027;
      let a5 = 1.061405429;
      let p = 0.3275911;

      let sign = (d < 0) ? -1 : 1;
      let x = Math.abs(d) / Math.sqrt(2);

      // A&S formula 7.1.26
      let t = 1.0 / (1.0 + p * x);
      let y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

      return 0.5 * (1.0 + sign * y);
    };

    // Find contracts within ±$100 of current stock price
    const priceLowerBound = this.stockPrice - 100;
    const priceUpperBound = this.stockPrice + 100;

    // Filter strikes within the price range
    const relevantStrikes = [...new Set([
      ...calls.map(call => parseFloat(call.strike_price)),
      ...puts.map(put => parseFloat(put.strike_price))
    ])].filter(strike =>
      strike >= priceLowerBound && strike <= priceUpperBound
    ).sort((a, b) => a - b);

    // Store all parity analysis for graphing
    const parityAnalysisData = [];

    // Find ATM strike for highlighting in the summary
    const atmStrike = this.findClosestStrike([...calls, ...puts], this.stockPrice);
    let summaryData = null;

    // Process each strike within the range
    relevantStrikes.forEach(strike => {
      // Find matching call and put at this strike
      const call = calls.find(call => Math.abs(parseFloat(call.strike_price) - strike) < 0.01);
      const put = puts.find(put => Math.abs(parseFloat(put.strike_price) - strike) < 0.01);

      // Skip if we don't have both call and put
      if (!call || !put) return;

      // Strike price
      const K = strike;

      // Current option prices (use mid-price between bid-ask)
      const callPrice = (parseFloat(call.bid) + parseFloat(call.ask)) / 2;
      const putPrice = (parseFloat(put.bid) + parseFloat(put.ask)) / 2;

      // Put-Call Parity equation values
      const leftSide = callPrice + (K * Math.exp(-riskFreeRate * T)); // c + Ke^{-rT}
      const rightSide = putPrice + (S0 * Math.exp(-dividendYield * T)); // p + S_0 e^{-qT}

      // Calculate the difference (theoretical arbitrage opportunity)
      const parityDifference = leftSide - rightSide;
      const parityDiffPercent = (parityDifference / rightSide) * 100;

      // Determine if the difference is significant enough to suggest a mispricing
      // Usually we need at least 0.5% difference to overcome transaction costs
      const significantDiff = Math.abs(parityDiffPercent) > 0.5;

      let arbitrageStrategy = "None";
      if (parityDifference > 0 && significantDiff) {
        arbitrageStrategy = "Conversion";
      } else if (parityDifference < 0 && significantDiff) {
        arbitrageStrategy = "Reversal";
      }

      // For simplicity, using the market implied volatility from the option
      const impliedVol = call.implied_volatility || put.implied_volatility || 0.3;

      // Calculate d1 and d2 using the dividend-adjusted BSM formula
      const d1 = (Math.log(S0 / K) + (riskFreeRate - dividendYield + (impliedVol * impliedVol / 2)) * T) / (impliedVol * Math.sqrt(T));
      const d2 = d1 - (impliedVol * Math.sqrt(T));

      // Calculate theoretical call and put prices using BSM with dividends
      const theoreticalCall = S0 * Math.exp(-dividendYield * T) * N(d1) - K * Math.exp(-riskFreeRate * T) * N(d2);
      const theoreticalPut = K * Math.exp(-riskFreeRate * T) * N(-d2) - S0 * Math.exp(-dividendYield * T) * N(-d1);

      // Calculate differences between market and theoretical prices
      const callDiff = callPrice - theoreticalCall;
      const putDiff = putPrice - theoreticalPut;

      // Store the analysis for this strike
      const analysis = {
        strike: K,
        callPrice,
        putPrice,
        theoreticalCall,
        theoreticalPut,
        callDiff,
        putDiff,
        parityDifference,
        parityDiffPercent,
        arbitrageStrategy,
        isATM: Math.abs(K - atmStrike) < 0.01,
        significantDiff
      };

      parityAnalysisData.push(analysis);

      // If this is the ATM strike, save it for the summary
      if (analysis.isATM) {
        summaryData = analysis;
      }
    });

    // Store the complete analysis data for other components to use
    this.parityAnalysisData = parityAnalysisData;

    // Make sure we have a summary data point (use the closest to ATM if exact ATM not found)
    if (!summaryData && parityAnalysisData.length > 0) {
      summaryData = parityAnalysisData.reduce((closest, current) =>
        Math.abs(current.strike - this.stockPrice) < Math.abs(closest.strike - this.stockPrice) ? current : closest
      );
    }

    // If we have no data at all, just return
    if (!summaryData) return;

    // Create the detailed arbitrage strategy text
    let arbitrageStrategyDetailed = "None - prices align with put-call parity";
    if (summaryData.parityDifference > 0 && summaryData.significantDiff) {
      arbitrageStrategyDetailed = "Consider conversion: Buy stock, buy put, sell call";
    } else if (summaryData.parityDifference < 0 && summaryData.significantDiff) {
      arbitrageStrategyDetailed = "Consider reversal: Sell stock, sell put, buy call";
    }

    // Add summary to results
    this.calculationResults.push({
      type: 'putCallParity',
      title: 'Put-Call Parity Analysis',
      data: [
        {
          label: 'Strike Price',
          value: `${summaryData.strike.toFixed(2)}`,
          tooltip: 'The strike price used for put-call parity analysis'
        },
        {
          label: 'Call Price',
          value: `${summaryData.callPrice.toFixed(2)}`,
          tooltip: 'Market mid-price of the call option'
        },
        {
          label: 'Put Price',
          value: `${summaryData.putPrice.toFixed(2)}`,
          tooltip: 'Market mid-price of the put option'
        },
        {
          label: 'Parity Difference',
          value: `${summaryData.parityDifference.toFixed(2)} (${summaryData.parityDiffPercent.toFixed(2)}%)`,
          tooltip: 'Difference between left and right sides of the put-call parity equation'
        },
        {
          label: 'BS Theoretical Call',
          value: `${summaryData.theoreticalCall.toFixed(2)}`,
          tooltip: 'Black-Scholes theoretical call price with dividend adjustment'
        },
        {
          label: 'BS Theoretical Put',
          value: `${summaryData.theoreticalPut.toFixed(2)}`,
          tooltip: 'Black-Scholes theoretical put price with dividend adjustment'
        },
        {
          label: 'Arbitrage Strategy',
          value: arbitrageStrategyDetailed,
          special: true,
          tooltip: 'Potential arbitrage strategy based on put-call parity analysis'
        },
        {
          label: 'Analysis Coverage',
          value: `${parityAnalysisData.length} strikes analyzed`,
          tooltip: `Full analysis performed on strikes from ${priceLowerBound.toFixed(2)} to ${priceUpperBound.toFixed(2)}`
        }
      ],
      graphData: parityAnalysisData // Add the complete data for graphing
    });
  },

  /**
   * Find potential arbitrage opportunities
   */
  findArbitrageOpportunities: function() {
    const calls = this.optionsData.calls;
    const puts = this.optionsData.puts;

    if (!calls.length || !puts.length) return;

    // Look for box spread arbitrage
    const boxSpreads = [];

    // Examine call/put pairs at the same strike for any conversion/reversal arb
    const arbitrages = [];

    // Find strikes that have both calls and puts
    const commonStrikes = [...new Set(
      calls.map(call => parseFloat(call.strike_price))
        .filter(strike => puts.some(put => parseFloat(put.strike_price) === strike))
    )].sort((a, b) => a - b);

    commonStrikes.forEach(strike => {
      const call = calls.find(c => parseFloat(c.strike_price) === strike);
      const put = puts.find(p => parseFloat(p.strike_price) === strike);

      if (!call || !put) return;

      // Check for put-call parity arbitrage
      // Put-Call Parity: Call Price - Put Price = Stock Price - Strike Price (discounted)

      const r = 0.05; // Assume 5% risk-free rate
      const t = this.daysToExpiration / 365; // Time in years
      const discountFactor = Math.exp(-r * t);

      const callPrice = (parseFloat(call.ask) + parseFloat(call.bid)) / 2;
      const putPrice = (parseFloat(put.ask) + parseFloat(put.bid)) / 2;

      const lhs = callPrice - putPrice;
      const rhs = this.stockPrice - (strike * discountFactor);

      const pricingError = lhs - rhs;

      // If pricing error is significant, there might be an arbitrage
      if (Math.abs(pricingError) > 0.5) { // $0.50 threshold to account for transaction costs
        let type = '';
        let strategy = '';

        if (pricingError > 0) {
          // Call is overpriced or put is underpriced
          type = 'Conversion';
          strategy = 'Short call, long put, long stock';
        } else {
          // Put is overpriced or call is underpriced
          type = 'Reversal';
          strategy = 'Long call, short put, short stock';
        }

        arbitrages.push({
          strike,
          type,
          strategy,
          expectedProfit: Math.abs(pricingError) * 100, // Per contract
          call,
          put
        });
      }
    });

    // Sort by expected profit
    const sortedArbitrages = [...arbitrages].sort((a, b) => b.expectedProfit - a.expectedProfit);

    // If any arbitrages found, add to results
    if (sortedArbitrages.length > 0) {
      this.calculationResults.push({
        type: 'arbitrage',
        title: 'Potential Arbitrage Opportunities',
        data: sortedArbitrages.slice(0, 3).map(arb => ({
          label: `${arb.type} at $${arb.strike}`,
          value: `$${arb.expectedProfit.toFixed(2)} per contract`,
          tooltip: `Strategy: ${arb.strategy}. Note: Transaction costs and execution risks may reduce actual profit.`,
          special: true
        }))
      });
    } else {
      this.calculationResults.push({
        type: 'arbitrage',
        title: 'Potential Arbitrage Opportunities',
        data: [
          {
            label: 'No significant arbitrage detected',
            value: 'Market appears efficient',
            tooltip: 'The options are priced in line with put-call parity, suggesting no risk-free profit opportunities'
          }
        ]
      });
    }
  },

  /**
   * Calculate put-call ratio
   */
  calculatePutCallRatio: function() {
    const calls = this.optionsData.calls;
    const puts = this.optionsData.puts;

    if (!calls.length || !puts.length) return;

    // Calculate volume and open interest for calls and puts
    const callVolume = calls.reduce((sum, call) => sum + (parseInt(call.volume) || 0), 0);
    const putVolume = puts.reduce((sum, put) => sum + (parseInt(put.volume) || 0), 0);

    const callOI = calls.reduce((sum, call) => sum + (parseInt(call.open_interest) || 0), 0);
    const putOI = puts.reduce((sum, put) => sum + (parseInt(put.open_interest) || 0), 0);

    // Calculate ratios
    const volumeRatio = putVolume / (callVolume || 1); // Avoid division by 0
    const oiRatio = putOI / (callOI || 1);

    // Interpret put-call ratio
    let volumeInterpretation = '';
    let oiInterpretation = '';

    if (volumeRatio > 1.5) {
      volumeInterpretation = 'Strongly bearish - Recent high put buying activity';
    } else if (volumeRatio > 1.0) {
      volumeInterpretation = 'Moderately bearish - More put than call activity';
    } else if (volumeRatio > 0.7) {
      volumeInterpretation = 'Neutral to slightly bearish';
    } else if (volumeRatio > 0.5) {
      volumeInterpretation = 'Neutral to slightly bullish';
    } else {
      volumeInterpretation = 'Bullish - Significantly more call than put activity';
    }

    if (oiRatio > 1.5) {
      oiInterpretation = 'Strongly bearish sentiment';
    } else if (oiRatio > 1.0) {
      oiInterpretation = 'Moderately bearish sentiment';
    } else if (oiRatio > 0.7) {
      oiInterpretation = 'Neutral to slightly bearish sentiment';
    } else if (oiRatio > 0.5) {
      oiInterpretation = 'Neutral to slightly bullish sentiment';
    } else {
      oiInterpretation = 'Bullish sentiment';
    }

    // Add to results
    this.calculationResults.push({
      type: 'putCallRatio',
      title: 'Put-Call Ratio Analysis',
      data: [
        {
          label: 'Volume P/C Ratio',
          value: volumeRatio.toFixed(2),
          tooltip: `Based on ${putVolume.toLocaleString()} put vs ${callVolume.toLocaleString()} call volume`
        },
        {
          label: 'Open Interest P/C Ratio',
          value: oiRatio.toFixed(2),
          tooltip: `Based on ${putOI.toLocaleString()} put vs ${callOI.toLocaleString()} call open interest`
        },
        {
          label: 'Volume Interpretation',
          value: volumeInterpretation,
          special: true
        },
        {
          label: 'OI Interpretation',
          value: oiInterpretation,
          special: true
        }
      ]
    });
  },

  /**
   * Find high volume and open interest options
   */
  findHighVolumeOptions: function() {
    const calls = this.optionsData.calls;
    const puts = this.optionsData.puts;

    if (!calls.length && !puts.length) return;

    // Combine all options
    const allOptions = [
      ...calls.map(call => ({ ...call, type: 'Call' })),
      ...puts.map(put => ({ ...put, type: 'Put' }))
    ];

    // Sort by volume
    const highestVolume = [...allOptions]
      .filter(opt => parseInt(opt.volume) > 0)
      .sort((a, b) => parseInt(b.volume) - parseInt(a.volume))
      .slice(0, 3);

    // Sort by open interest
    const highestOI = [...allOptions]
      .filter(opt => parseInt(opt.open_interest) > 0)
      .sort((a, b) => parseInt(b.open_interest) - parseInt(a.open_interest))
      .slice(0, 3);

    // Calculate volume/OI ratio to find unusual activity
    const withVolumeOIRatio = allOptions
      .filter(opt => parseInt(opt.open_interest) > 10) // Minimum OI threshold
      .map(opt => ({
        ...opt,
        volumeOIRatio: parseInt(opt.volume) / parseInt(opt.open_interest)
      }))
      .filter(opt => opt.volumeOIRatio > 0.5) // Minimum ratio threshold
      .sort((a, b) => b.volumeOIRatio - a.volumeOIRatio)
      .slice(0, 3);

    // Add to results
    if (highestVolume.length > 0 || highestOI.length > 0) {
      this.calculationResults.push({
        type: 'highVolume',
        title: 'Notable Option Activity',
        data: [
          ...highestVolume.map((opt, i) => ({
            label: `#${i+1} Highest Volume`,
            value: `${opt.type} $${parseFloat(opt.strike_price).toFixed(2)}: ${parseInt(opt.volume).toLocaleString()} contracts`,
            tooltip: `Strike price is ${((parseFloat(opt.strike_price) - this.stockPrice) / this.stockPrice * 100).toFixed(2)}% ${parseFloat(opt.strike_price) > this.stockPrice ? 'above' : 'below'} current price`
          })),
          ...highestOI.map((opt, i) => ({
            label: `#${i+1} Highest Open Interest`,
            value: `${opt.type} $${parseFloat(opt.strike_price).toFixed(2)}: ${parseInt(opt.open_interest).toLocaleString()} contracts`,
            tooltip: `Strike price is ${((parseFloat(opt.strike_price) - this.stockPrice) / this.stockPrice * 100).toFixed(2)}% ${parseFloat(opt.strike_price) > this.stockPrice ? 'above' : 'below'} current price`
          })),
          ...withVolumeOIRatio.map((opt, i) => ({
            label: `Unusual Activity #${i+1}`,
            value: `${opt.type} $${parseFloat(opt.strike_price).toFixed(2)}: ${opt.volumeOIRatio.toFixed(2)}x V/OI ratio`,
            tooltip: `${parseInt(opt.volume).toLocaleString()} volume on ${parseInt(opt.open_interest).toLocaleString()} open interest`
          }))
        ]
      });
    }
  },

  /**
   * Calculate summary statistics for options
   */
  calculateSummaryStats: function() {
    const calls = this.optionsData.calls;
    const puts = this.optionsData.puts;

    if (!calls.length && !puts.length) return;

    // Calculate premium values
    const totalCallPremium = calls.reduce((sum, call) =>
      sum + (parseFloat(call.bid) * parseInt(call.open_interest) * 100), 0); // Multiply by 100 for contract size

    const totalPutPremium = puts.reduce((sum, put) =>
      sum + (parseFloat(put.bid) * parseInt(put.open_interest) * 100), 0);

    // Calculate averages
    const avgCallPremium = calls.length ? calls.reduce((sum, call) => sum + parseFloat(call.bid), 0) / calls.length : 0;
    const avgPutPremium = puts.length ? puts.reduce((sum, put) => sum + parseFloat(put.bid), 0) / puts.length : 0;

    // Calculate implied move
    const nearestCallStrike = this.findClosestStrike(calls, this.stockPrice);
    const nearestPutStrike = this.findClosestStrike(puts, this.stockPrice);

    const atmCall = calls.find(call => parseFloat(call.strike_price) === nearestCallStrike);
    const atmPut = puts.find(put => parseFloat(put.strike_price) === nearestPutStrike);

    let impliedMove = 0;
    if (atmCall && atmPut) {
      // Simplified calculation: (atmCall.bid + atmPut.bid) / stockPrice
      const straddlePrice = parseFloat(atmCall.bid) + parseFloat(atmPut.bid);
      impliedMove = straddlePrice / this.stockPrice;
    }

    // Add to results
    this.calculationResults.push({
      type: 'summaryStats',
      title: 'Options Summary Statistics',
      data: [
        {
          label: 'Total Call Premium',
          value: `$${this.formatLargeNumber(totalCallPremium)}`,
          tooltip: `Total value of all call options based on current bid prices and open interest`
        },
        {
          label: 'Total Put Premium',
          value: `$${this.formatLargeNumber(totalPutPremium)}`,
          tooltip: `Total value of all put options based on current bid prices and open interest`
        },
        {
          label: 'Average Call Premium',
          value: `$${avgCallPremium.toFixed(2)}`,
          tooltip: `Average premium across all calls`
        },
        {
          label: 'Average Put Premium',
          value: `$${avgPutPremium.toFixed(2)}`,
          tooltip: `Average premium across all puts`
        },
        {
          label: 'Implied Move',
          value: `${(impliedMove * 100).toFixed(2)}%`,
          tooltip: `Expected stock price move by expiration based on ATM straddle pricing`
        }
      ]
    });
  },

  /**
   * Helper function to find the closest strike price to a target value
   * @param {Array} options - Array of options objects
   * @param {number} targetPrice - Target price to find closest strike to
   * @returns {number} - Closest strike price
   */
  findClosestStrike: function(options, targetPrice) {
    if (!options.length) return null;

    // Extract strikes and convert to numbers
    const strikes = options.map(opt => parseFloat(opt.strike_price));

    // Find closest strike to target price
    return strikes.reduce((prev, curr) =>
      Math.abs(curr - targetPrice) < Math.abs(prev - targetPrice) ? curr : prev
    );
  },

  /**
   * Format large numbers with K/M/B suffixes
   * @param {number} num - Number to format
   * @returns {string} - Formatted number string
   */
  formatLargeNumber: function(num) {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  },

  /**
   * Render calculation results to the page
   */
  renderCalculations: function() {
    // Get or create the container
    let container = document.getElementById('options-calculations-container');
    if (!container) {
      console.error('Options calculations container not found');
      return;
    }

    // Show the container
    container.classList.remove('d-none');

    // Create HTML for the results
    let html = `
      <div class="mt-4">
        <h4>Options Analytics for ${this.symbol} - ${this.formatDateDisplay(this.expirationDate)}</h4>
        <div class="row">
    `;

    // Add each calculation section
    this.calculationResults.forEach(result => {
      // For put-call parity, create a special visualization section if we have graph data
      const hasPutCallParityGraph = result.type === 'putCallParity' && result.graphData && result.graphData.length > 0;

      // Determine column width based on if this is a visualization
      const colClass = hasPutCallParityGraph ? 'col-md-12 mb-3' : 'col-md-6 col-lg-4 mb-3';

      html += `
        <div class="${colClass}">
          <div class="card h-100">
            <div class="card-header bg-light">
              <h5 class="card-title mb-0">${result.title}</h5>
            </div>
            <div class="card-body">
      `;

      // For put-call parity visualizations, create a special layout
      if (hasPutCallParityGraph) {
        html += `
          <div class="row">
            <div class="col-md-4">
              <table class="table table-sm">
                <tbody>
        `;

        // Add each data point for the summary
        result.data.forEach(item => {
          const specialClass = item.special ? 'table-info' : '';
          html += `
            <tr class="${specialClass}">
              <td>${item.label}</td>
              <td class="text-end" ${item.tooltip ? `data-bs-toggle="tooltip" title="${item.tooltip}"` : ''}>
                ${item.value}
              </td>
            </tr>
          `;
        });

        html += `
                </tbody>
              </table>
            </div>
            <div class="col-md-8">
              <div id="put-call-parity-chart" class="chart-container">
                <canvas id="parity-chart"></canvas>
              </div>
              <div class="text-center text-muted small">
                Put-Call Parity Analysis Across Strikes
              </div>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-sm btn-outline-primary" id="add-parity-to-options-table">
              Show Parity Data in Options Table
            </button>
            <div class="mt-2 small text-muted">
              Click to highlight put-call parity analysis in the options chain table
            </div>
          </div>
        `;

        // Store the graph data as a JSON string in a hidden input for the chart initialization
        html += `<input type="hidden" id="parity-data-json" value='${JSON.stringify(result.graphData)}' />`;
      } else {
        // Regular table layout for other calculation types
        html += `
              <table class="table table-sm">
                <tbody>
        `;

        // Add each data point
        result.data.forEach(item => {
          const specialClass = item.special ? 'table-info' : '';
          html += `
            <tr class="${specialClass}">
              <td>${item.label}</td>
              <td class="text-end" ${item.tooltip ? `data-bs-toggle="tooltip" title="${item.tooltip}"` : ''}>
                ${item.value}
              </td>
            </tr>
          `;
        });

        html += `
                </tbody>
              </table>
        `;
      }

      // Close the card
      html += `
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    // Update the container
    container.innerHTML = html;

    // Initialize tooltips
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
      const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltips.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }

    // Initialize the put-call parity chart if available
    this.initializeParityChart();

    // Add event listener for the "Show in Options Table" button
    const addParityButton = document.getElementById('add-parity-to-options-table');
    if (addParityButton) {
      addParityButton.addEventListener('click', this.addParityDataToOptionsTable.bind(this));
    }
  },

  /**
   * Initialize the put-call parity visualization chart
   */
  initializeParityChart: function() {
    const dataInput = document.getElementById('parity-data-json');
    const chartCanvas = document.getElementById('parity-chart');

    if (!dataInput || !chartCanvas) return;

    // Parse the parity data
    let parityData;
    try {
      parityData = JSON.parse(dataInput.value);
    } catch (e) {
      console.error('Failed to parse parity data:', e);
      return;
    }

    // Prepare data for the chart
    const labels = parityData.map(item => item.strike);
    const parityDiffData = parityData.map(item => item.parityDifference);
    const callDiffData = parityData.map(item => item.callDiff);
    const putDiffData = parityData.map(item => item.putDiff);

    // Create colors with stronger emphasis on significant differences
    const parityColors = parityData.map(item => {
      if (!item.significantDiff) return 'rgba(100, 100, 100, 0.6)'; // Gray for non-significant
      return item.parityDifference > 0 ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)'; // Green or red
    });

    // Create the chart
    const ctx = chartCanvas.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Put-Call Parity Difference ($)',
          data: parityDiffData,
          backgroundColor: parityColors,
          borderColor: parityColors.map(color => color.replace('0.6', '1').replace('0.8', '1')),
          borderWidth: 1
        }, {
          label: 'Call Price Difference',
          data: callDiffData,
          type: 'line',
          borderColor: 'rgba(54, 162, 235, 0.8)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }, {
          label: 'Put Price Difference',
          data: putDiffData,
          type: 'line',
          borderColor: 'rgba(255, 159, 64, 0.8)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Strike Price ($)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Price Difference ($)'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const index = context.dataIndex;
                const item = parityData[index];
                if (context.datasetIndex === 0) {
                  return [
                    `Strategy: ${item.arbitrageStrategy}`,
                    `Difference: ${(item.parityDiffPercent).toFixed(2)}%`,
                    `Call: ${item.callPrice.toFixed(2)}, Put: ${item.putPrice.toFixed(2)}`
                  ];
                }
                return [];
              }
            }
          },
          annotation: {
            annotations: {
              line1: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: 'rgba(0, 0, 0, 0.2)',
                borderWidth: 1,
                borderDash: [5, 5]
              }
            }
          }
        }
      }
    });
  },

  /**
   * Add parity data to the options table display
   * This communicates with the OptionsTable component
   */
  addParityDataToOptionsTable: function() {
    // Find the calculation result with parity data
    const parityResult = this.calculationResults.find(result => result.type === 'putCallParity');
    if (!parityResult || !parityResult.graphData) {
      console.error('No parity data available to add to options table');
      return;
    }

    // Format the data for the options table
    const parityTableData = parityResult.graphData.map(item => ({
      strike: item.strike,
      callParity: item.callDiff.toFixed(2),
      putParity: item.putDiff.toFixed(2),
      parityDiff: item.parityDifference.toFixed(2),
      arbitrage: item.significantDiff ? item.arbitrageStrategy : '',
      significantDiff: item.significantDiff
    }));

    // Check if OptionsTable component exists and has the necessary method
    if (window.OptionsTable && typeof window.OptionsTable.addParityAnalysis === 'function') {
      window.OptionsTable.addParityAnalysis(parityTableData);
    } else {
      // If the table component isn't ready, we'll save the data for it to access later
      window.pendingParityTableData = parityTableData;
      console.log('OptionsTable not ready, storing parity data for later access');

      // Notify the user
      if (window.FinancialHub && window.FinancialHub.notification) {
        window.FinancialHub.notification(
          'Parity data ready for display. Please reload the options chain if it doesn\'t appear.',
          'info'
        );
      }
    }
  },

  /**
   * Format date for display
   * @param {string} dateStr - Date string
   * @returns {string} - Formatted date string
   */
  formatDateDisplay: function(dateStr) {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateStr;
    }
  }
};

// Export the module
window.OptionsCalculation = OptionsCalculation;

console.log('Options calculation module loaded with dividend-adjusted models');