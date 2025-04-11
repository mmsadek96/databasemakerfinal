from typing import Dict, Any, Union


def format_financial_data_for_openai(financial_data: Dict[str, Any]) -> str:
    """
    Format financial data as a concise text summary for OpenAI prompt

    Args:
        financial_data: Dictionary containing financial data

    Returns:
        Formatted string for OpenAI prompt
    """
    metrics = extract_key_financial_metrics(financial_data)

    # Format the data as a string for the OpenAI prompt
    summary = f"""
### Financial Overview for {metrics.get('company_name', financial_data['symbol'])} ###
Sector: {metrics.get('sector', 'N/A')}
Industry: {metrics.get('industry', 'N/A')}
Market Cap: ${format_value(metrics.get('market_cap', 'N/A'))}

Performance Metrics:
- P/E Ratio: {metrics.get('pe_ratio', 'N/A')}
- EPS: ${metrics.get('eps', 'N/A')}
- Profit Margin: {metrics.get('profit_margin', 'N/A')}
- Quarterly Earnings Growth YoY: {metrics.get('quarterly_earnings_growth', 'N/A')}
- Quarterly Revenue Growth YoY: {metrics.get('quarterly_revenue_growth', 'N/A')}

Latest Financial Results:
- Total Revenue: ${format_value(metrics.get('total_revenue', 'N/A'))}
- Gross Profit: ${format_value(metrics.get('gross_profit', 'N/A'))}
- Net Income: ${format_value(metrics.get('net_income', 'N/A'))}
- EBITDA: ${format_value(metrics.get('ebitda', 'N/A'))}

Balance Sheet Highlights:
- Total Assets: ${format_value(metrics.get('total_assets', 'N/A'))}
- Total Liabilities: ${format_value(metrics.get('total_liabilities', 'N/A'))}
- Total Equity: ${format_value(metrics.get('total_equity', 'N/A'))}
- Current Ratio: {metrics.get('current_ratio', 'N/A')}
- Debt to Equity: {metrics.get('debt_to_equity', 'N/A')}

Cash Flow Insights:
- Operating Cash Flow: ${format_value(metrics.get('operating_cash_flow', 'N/A'))}
- Capital Expenditures: ${format_value(metrics.get('capital_expenditures', 'N/A'))}
- Free Cash Flow: ${format_value(metrics.get('free_cash_flow', 'N/A'))}
"""

    # Add insider transaction summary if available
    insider_activity = metrics.get('recent_insider_activity', None)
    if insider_activity and isinstance(insider_activity, dict):
        summary += f"""
Insider Transaction Activity (Recent):
- Buy Transactions: {insider_activity.get('buy_transactions', 0)}
- Sell Transactions: {insider_activity.get('sell_transactions', 0)}
- Buy Volume: {insider_activity.get('buy_volume', 0):,} shares
- Sell Volume: {insider_activity.get('sell_volume', 0):,} shares
- Net Activity: {insider_activity.get('net_activity', 'Neutral')}
"""
    elif insider_activity:
        summary += f"\nInsider Transactions: {insider_activity}\n"

    return summary


def extract_key_financial_metrics(financial_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract key financial metrics from the comprehensive financial data

    Args:
        financial_data: Dictionary containing financial data

    Returns:
        Dictionary of key metrics
    """
    metrics = {}

    # Extract company overview metrics
    overview = financial_data.get('company_overview', {})
    if overview:
        metrics['company_name'] = overview.get('Name', '')
        metrics['sector'] = overview.get('Sector', '')
        metrics['industry'] = overview.get('Industry', '')
        metrics['market_cap'] = overview.get('MarketCapitalization', '')
        metrics['pe_ratio'] = overview.get('PERatio', '')
        metrics['eps'] = overview.get('EPS', '')
        metrics['dividend_yield'] = overview.get('DividendYield', '')
        metrics['profit_margin'] = overview.get('ProfitMargin', '')
        metrics['quarterly_earnings_growth'] = overview.get('QuarterlyEarningsGrowthYOY', '')
        metrics['quarterly_revenue_growth'] = overview.get('QuarterlyRevenueGrowthYOY', '')
        metrics['52_week_high'] = overview.get('52WeekHigh', '')
        metrics['52_week_low'] = overview.get('52WeekLow', '')

    # Extract latest income statement metrics
    income = financial_data.get('income_statement', {})
    if income and 'annualReports' in income and income['annualReports']:
        latest_income = income['annualReports'][0]
        metrics['total_revenue'] = latest_income.get('totalRevenue', '')
        metrics['gross_profit'] = latest_income.get('grossProfit', '')
        metrics['net_income'] = latest_income.get('netIncome', '')
        metrics['ebitda'] = latest_income.get('ebitda', '')

    # Extract latest balance sheet metrics
    balance = financial_data.get('balance_sheet', {})
    # Extract latest balance sheet metrics
    balance = financial_data.get('balance_sheet', {})
    if balance and 'annualReports' in balance and balance['annualReports']:
        latest_balance = balance['annualReports'][0]
        metrics['total_assets'] = latest_balance.get('totalAssets', '')
        metrics['total_liabilities'] = latest_balance.get('totalLiabilities', '')
        metrics['total_equity'] = latest_balance.get('totalShareholderEquity', '')
        metrics['current_ratio'] = calculate_ratio(
            latest_balance.get('totalCurrentAssets', 0),
            latest_balance.get('totalCurrentLiabilities', 1)
        )
        metrics['debt_to_equity'] = calculate_ratio(
            latest_balance.get('totalLiabilities', 0),
            latest_balance.get('totalShareholderEquity', 1)
        )

    # Extract latest cash flow metrics
    cash_flow = financial_data.get('cash_flow', {})
    if cash_flow and 'annualReports' in cash_flow and cash_flow['annualReports']:
        latest_cash_flow = cash_flow['annualReports'][0]
        metrics['operating_cash_flow'] = latest_cash_flow.get('operatingCashflow', '')
        metrics['capital_expenditures'] = latest_cash_flow.get('capitalExpenditures', '')
        metrics['free_cash_flow'] = calculate_fcf(
            latest_cash_flow.get('operatingCashflow', 0),
            latest_cash_flow.get('capitalExpenditures', 0)
        )

    # Extract insider transactions summary
    insider = financial_data.get('insider_transactions', {})
    if insider and 'transactions' in insider and insider['transactions']:
        metrics['recent_insider_activity'] = summarize_insider_transactions(insider['transactions'][:10])

    return metrics


def format_value(value: Union[str, int, float]) -> str:
    """
    Format a financial value for better readability

    Args:
        value: Value to format

    Returns:
        Formatted value string
    """
    if value == 'N/A' or value == '':
        return 'N/A'

    try:
        num = float(value)
        if num >= 1_000_000_000:  # Billions
            return f"{num / 1_000_000_000:.2f}B"
        elif num >= 1_000_000:  # Millions
            return f"{num / 1_000_000:.2f}M"
        elif num >= 1_000:  # Thousands
            return f"{num / 1_000:.2f}K"
        else:
            return f"{num:.2f}"
    except (ValueError, TypeError):
        return str(value)


def format_percentage(value: Union[str, int, float]) -> str:
    """
    Format a percentage value

    Args:
        value: Value to format

    Returns:
        Formatted percentage string
    """
    try:
        num = float(value)
        return f"{num:.2f}%"
    except (ValueError, TypeError):
        return str(value)


def format_date(date_str: str, output_format: str = "%b %d, %Y") -> str:
    """
    Format a date string

    Args:
        date_str: Date string to format
        output_format: Output date format

    Returns:
        Formatted date string
    """
    from datetime import datetime

    try:
        # Parse various date formats
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y", "%Y%m%d"):
            try:
                date_obj = datetime.strptime(date_str, fmt)
                return date_obj.strftime(output_format)
            except ValueError:
                continue

        # If all parsing attempts failed
        return date_str
    except Exception:
        return date_str