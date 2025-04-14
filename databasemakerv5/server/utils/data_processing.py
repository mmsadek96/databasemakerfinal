import pandas as pd
from typing import Optional
from datetime import datetime


def apply_date_filter(df: pd.DataFrame, start_date: Optional[str] = None,
                      end_date: Optional[str] = None) -> pd.DataFrame:
    """
    Filter a dataframe to only include data within the specified date range

    Args:
        df: DataFrame with datetime index
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format

    Returns:
        Filtered DataFrame
    """
    if df.empty:
        return df

    # Set default date range if not provided
    min_allowed = pd.Timestamp('2010-01-01')
    if start_date:
        start_date = max(pd.to_datetime(start_date), min_allowed)
    else:
        start_date = min_allowed

    if end_date:
        end_date = pd.to_datetime(end_date)
    else:
        end_date = pd.Timestamp.today()

    # Apply filters
    filtered_df = df.copy()
    filtered_df = filtered_df[filtered_df.index >= start_date]
    filtered_df = filtered_df[filtered_df.index <= end_date]

    return filtered_df


def parse_csv_data(csv_content: str) -> pd.DataFrame:
    """
    Parse CSV content to a DataFrame

    Args:
        csv_content: String containing CSV data

    Returns:
        DataFrame with parsed data
    """
    try:
        df = pd.read_csv(pd.StringIO(csv_content))
        return df
    except Exception as e:
        raise ValueError(f"Failed to parse CSV data: {str(e)}")


def resample_time_series(df: pd.DataFrame, column: str,
                         frequency: str = 'D') -> pd.DataFrame:
    """
    Resample time series data to a specified frequency

    Args:
        df: DataFrame with datetime index
        column: Column name to resample
        frequency: Pandas frequency string (D=daily, W=weekly, M=monthly)

    Returns:
        Resampled DataFrame
    """
    if df.empty:
        return df

    # Ensure index is datetime
    if not isinstance(df.index, pd.DatetimeIndex):
        raise ValueError("DataFrame index must be DatetimeIndex")

    # Resample data
    resampled = df[column].resample(frequency)

    # Create result DataFrame with different aggregations
    result = pd.DataFrame({
        f'{column}_first': resampled.first(),
        f'{column}_last': resampled.last(),
        f'{column}_mean': resampled.mean(),
        f'{column}_min': resampled.min(),
        f'{column}_max': resampled.max()
    })

    return result