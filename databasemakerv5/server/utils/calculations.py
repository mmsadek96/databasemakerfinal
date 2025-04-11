from typing import Dict, List, Any, Union
import re


def calculate_ratio(numerator: Union[str, int, float],
                    denominator: Union[str, int, float]) -> str:
    """
    Calculate a financial ratio safely

    Args:
        numerator: Numerator value
        denominator: Denominator value

    Returns:
        Calculated ratio as string
    """
    try:
        num = float(numerator)
        den = float(denominator)
        if den == 0:
            return "N/A"
        return str(round(num / den, 2))
    except (ValueError, TypeError):
        return "N/A"


def calculate_fcf(operating_cash_flow: Union[str, int, float],
                  capital_expenditures: Union[str, int, float]) -> str:
    """
    Calculate free cash flow safely

    Args:
        operating_cash_flow: Operating cash flow value
        capital_expenditures: Capital expenditures value

    Returns:
        Calculated free cash flow as string
    """
    try:
        ocf = float(operating_cash_flow)
        capex = float(capital_expenditures)
        # Capital expenditures are typically negative in financial statements
        if capex < 0:
            return str(ocf + capex)  # Adding a negative number = subtraction
        else:
            return str(ocf - capex)
    except (ValueError, TypeError):
        return "N/A"


def summarize_insider_transactions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Summarize recent insider transactions

    Args:
        transactions: List of transaction dictionaries

    Returns:
        Summary of transactions
    """
    if not transactions:
        return "No recent insider transactions found"

    buy_count = 0
    sell_count = 0
    buy_volume = 0
    sell_volume = 0

    for transaction in transactions:
        try:
            transaction_type = transaction.get('transactionType', '').lower()
            shares = float(transaction.get('transactionShares', 0) or 0)

            if 'buy' in transaction_type or 'purchase' in transaction_type:
                buy_count += 1
                buy_volume += shares
            elif 'sell' in transaction_type or 'sale' in transaction_type:
                sell_count += 1
                sell_volume += shares
        except (ValueError, TypeError):
            continue

    return {
        "buy_transactions": buy_count,
        "sell_transactions": sell_count,
        "buy_volume": int(buy_volume),
        "sell_volume": int(sell_volume),
        "net_activity": "Buying" if buy_volume > sell_volume else "Selling" if sell_volume > buy_volume else "Neutral"
    }


def calculate_sentiment(text: str) -> float:
    """
    Calculate sentiment score for a piece of text

    Args:
        text: The text to analyze

    Returns:
        Sentiment score between -1 (negative) and 1 (positive)
    """
    # Simple sentiment analysis using keyword lists
    positive_words = [
        'growth', 'increase', 'profit', 'positive', 'strong', 'success', 'exceed',
        'better', 'opportunity', 'confident', 'improvement', 'improved', 'gain',
        'advantage', 'optimistic', 'innovation', 'efficient', 'leadership', 'momentum'
    ]

    negative_words = [
        'decline', 'decrease', 'loss', 'negative', 'weak', 'challenge', 'difficult',
        'below', 'risk', 'concern', 'disappoint', 'miss', 'issue', 'problem',
        'down', 'unexpected', 'disappointing', 'uncertainty', 'cautious'
    ]

    text_lower = text.lower()

    # Count word occurrences
    positive_count = 0
    for word in positive_words:
        pattern = r'\b' + re.escape(word) + r'\b'
        positive_count += len(re.findall(pattern, text_lower))

    negative_count = 0
    for word in negative_words:
        pattern = r'\b' + re.escape(word) + r'\b'
        negative_count += len(re.findall(pattern, text_lower))

    total_count = positive_count + negative_count

    if total_count == 0:
        return 0.0

    return (positive_count - negative_count) / total_count