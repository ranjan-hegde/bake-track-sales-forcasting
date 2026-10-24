"""
Synthetic dataset generator for the dual-model (SVR + LightGBM) sales forecaster.

Produces one row per (Publication x Region x Date) over a 2-year window and writes
the canonical 17-feature demographic schema that the preprocessor, both models, the
prediction pipeline, the API, and the web UI all expect.

Column contract (order matters - it defines the trained feature order):
    Date, Publication_Name, Publication_Category, Region, Customer_Age, Income_Level,
    Educational_Background, Occupation, Season, Day_of_Week, Is_Weekend, Is_Holiday,
    Is_Festival, Special_Events, Promotion, Price, Previous_Day_Sales,
    Previous_Week_Sales, Sales_Quantity
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import holidays
import time
import os
import itertools

print("Generating synthetic newspaper/magazine sales dataset (demographic schema)...")
start_time = time.time()

# 1. Catalogue -------------------------------------------------------------
publications = ['Mythological Tales', 'DC & Marvel Comics', 'The Science Explorer', 'History Chronicles', 'Fantasy Realm', 'Vogue India', 'Tech Today', 'Business World', 'Sports Star', 'India Today']
regions = ['North', 'South', 'East', 'West']
income_levels = ['Low', 'Medium', 'High']
educations = ['High School', 'Bachelor', 'Master', 'PhD']
occupations = ['Student', 'Professional', 'Business', 'Retired']

publication_categories = {
    'Mythological Tales': 'Religious & Spiritual',
    'DC & Marvel Comics': 'Comic',
    'The Science Explorer': 'Science & Technology',
    'History Chronicles': 'History & Culture',
    'Fantasy Realm': 'Fiction & Fantasy',
    'Vogue India': 'Fashion Magazine',
    'Tech Today': 'Tech Magazine',
    'Business World': 'Business Magazine',
    'Sports Star': 'Sports Magazine',
    'India Today': 'News Magazine',
}
prices = {
    'Mythological Tales': 180.0,
    'DC & Marvel Comics': 120.0,
    'The Science Explorer': 250.0,
    'History Chronicles': 200.0,
    'Fantasy Realm': 220.0,
    'Vogue India': 150.0,
    'Tech Today': 100.0,
    'Business World': 130.0,
    'Sports Star': 90.0,
    'India Today': 60.0,
}
# 'None' is kept as an explicit, frequent class so "no special event" is a real,
# learnable value (this is what fixes the prediction-time fallback bug).
special_events_pool = ['None', 'None', 'None', 'None', 'None',
                       'Election Day', 'Local Fair', 'Sports Final', 'Mega Sale', 'Cultural Fest']

# 2. Date grid: exactly one row per Publication x Region x Date over 2 years
end_date = datetime.now().date()
start_date = end_date - timedelta(days=730)
date_list = [start_date + timedelta(days=x) for x in range(731)]
grid = list(itertools.product(date_list, publications, regions))
df = pd.DataFrame(grid, columns=['Date', 'Publication_Name', 'Region'])
num_rows = len(df)
print(f"Grid: {num_rows} rows (731 days x {len(publications)} publications x {len(regions)} regions)")

np.random.seed(42)

# 3. Static / demographic / temporal features -----------------------------
df['Publication_Category'] = df['Publication_Name'].map(publication_categories)
df['Price'] = (df['Publication_Name'].map(prices) + np.random.uniform(-1.0, 2.0, num_rows)).round(2)

# Demographics of the majority buyer segment for that day's aggregate
df['Customer_Age'] = np.random.randint(18, 75, num_rows)
df['Income_Level'] = np.random.choice(income_levels, num_rows, p=[0.3, 0.5, 0.2])
df['Educational_Background'] = np.random.choice(educations, num_rows, p=[0.4, 0.4, 0.15, 0.05])
df['Occupation'] = np.random.choice(occupations, num_rows)

df['Date'] = pd.to_datetime(df['Date'])
df['Day_of_Week'] = df['Date'].dt.dayofweek
df['Is_Weekend'] = (df['Day_of_Week'] >= 5).astype(int)

def get_season(month):
    if month in [12, 1, 2]: return 'Winter'
    elif month in [3, 4, 5]: return 'Spring'
    elif month in [6, 7, 8]: return 'Summer'
    else: return 'Autumn'
df['Season'] = df['Date'].dt.month.apply(get_season)

df['Promo_Discount'] = np.random.choice([0, 10, 15, 20, 25, 30, 40, 50], num_rows, p=[0.8, 0.05, 0.05, 0.03, 0.02, 0.02, 0.015, 0.015])
df['Special_Events'] = np.random.choice(special_events_pool, num_rows)

# Holidays & festivals (Indian calendar)
in_holidays = holidays.IN(years=[start_date.year, start_date.year + 1, end_date.year])

# Hardcoded exact dates for 2023 and 2024 for 28 specific festivals requested
custom_festivals = {
    datetime(2023, 1, 13).date(): 'Lohri', datetime(2024, 1, 13).date(): 'Lohri',
    datetime(2023, 1, 14).date(): 'Makar Sankranti', datetime(2024, 1, 15).date(): 'Makar Sankranti',
    datetime(2023, 1, 15).date(): 'Pongal', datetime(2024, 1, 15).date(): 'Pongal',
    datetime(2023, 2, 18).date(): 'Maha Shivaratri', datetime(2024, 3, 8).date(): 'Maha Shivaratri',
    datetime(2023, 3, 8).date(): 'Holi', datetime(2024, 3, 25).date(): 'Holi',
    datetime(2023, 3, 22).date(): 'Ugadi', datetime(2024, 4, 9).date(): 'Ugadi',
    datetime(2023, 3, 22).date(): 'Gudi Padwa', datetime(2024, 4, 9).date(): 'Gudi Padwa',
    datetime(2023, 3, 30).date(): 'Ram Navami', datetime(2024, 4, 17).date(): 'Ram Navami',
    datetime(2023, 4, 4).date(): 'Mahavir Jayanti', datetime(2024, 4, 21).date(): 'Mahavir Jayanti',
    datetime(2023, 4, 14).date(): 'Baisakhi', datetime(2024, 4, 13).date(): 'Baisakhi',
    datetime(2023, 5, 5).date(): 'Buddha Purnima', datetime(2024, 5, 23).date(): 'Buddha Purnima',
    datetime(2023, 8, 30).date(): 'Raksha Bandhan', datetime(2024, 8, 19).date(): 'Raksha Bandhan',
    datetime(2023, 9, 6).date(): 'Janmashtami', datetime(2024, 8, 26).date(): 'Janmashtami',
    datetime(2023, 9, 19).date(): 'Ganesh Chaturthi', datetime(2024, 9, 7).date(): 'Ganesh Chaturthi',
    datetime(2023, 8, 29).date(): 'Onam', datetime(2024, 9, 15).date(): 'Onam',
    datetime(2023, 10, 15).date(): 'Navratri', datetime(2024, 10, 3).date(): 'Navratri',
    datetime(2023, 10, 23).date(): 'Maha Navami', datetime(2024, 10, 11).date(): 'Maha Navami',
    datetime(2023, 10, 24).date(): 'Durga Puja', datetime(2024, 10, 12).date(): 'Durga Puja',
    datetime(2023, 10, 24).date(): 'Dussehra/Dasara', datetime(2024, 10, 12).date(): 'Dussehra/Dasara',
    datetime(2023, 11, 1).date(): 'Karva Chauth', datetime(2024, 10, 20).date(): 'Karva Chauth',
    datetime(2023, 11, 12).date(): 'Diwali/Deepavali', datetime(2024, 10, 31).date(): 'Diwali/Deepavali',
    datetime(2023, 11, 15).date(): 'Bhai Dooj', datetime(2024, 11, 3).date(): 'Bhai Dooj',
    datetime(2023, 11, 19).date(): 'Chhath', datetime(2024, 11, 7).date(): 'Chhath',
    datetime(2023, 11, 27).date(): 'Guru Nanak Jayanti', datetime(2024, 11, 15).date(): 'Guru Nanak Jayanti',
    datetime(2023, 4, 22).date(): 'Eid al-Fitr', datetime(2024, 4, 11).date(): 'Eid al-Fitr',
    datetime(2023, 6, 29).date(): 'Eid al-Adha', datetime(2024, 6, 17).date(): 'Eid al-Adha',
    datetime(2023, 12, 25).date(): 'Christmas', datetime(2024, 12, 25).date(): 'Christmas',
    # Future dates (2025-2029)
    datetime(2025, 3, 14).date(): 'Holi', datetime(2025, 8, 27).date(): 'Ganesh Chaturthi', datetime(2025, 10, 2).date(): 'Dussehra', datetime(2025, 10, 20).date(): 'Diwali/Deepavali', datetime(2025, 12, 25).date(): 'Christmas',
    datetime(2026, 3, 4).date(): 'Holi', datetime(2026, 9, 14).date(): 'Ganesh Chaturthi', datetime(2026, 10, 18).date(): 'Navratri', datetime(2026, 10, 20).date(): 'Dussehra', datetime(2026, 11, 8).date(): 'Diwali/Deepavali', datetime(2026, 12, 25).date(): 'Christmas',
    datetime(2027, 3, 22).date(): 'Holi', datetime(2027, 9, 4).date(): 'Ganesh Chaturthi', datetime(2027, 10, 9).date(): 'Dussehra', datetime(2027, 10, 29).date(): 'Diwali/Deepavali', datetime(2027, 12, 25).date(): 'Christmas',
    datetime(2028, 3, 11).date(): 'Holi', datetime(2028, 8, 23).date(): 'Ganesh Chaturthi', datetime(2028, 9, 27).date(): 'Dussehra', datetime(2028, 10, 17).date(): 'Diwali/Deepavali', datetime(2028, 12, 25).date(): 'Christmas',
    datetime(2029, 3, 1).date(): 'Holi', datetime(2029, 9, 11).date(): 'Ganesh Chaturthi', datetime(2029, 10, 16).date(): 'Dussehra', datetime(2029, 11, 5).date(): 'Diwali/Deepavali', datetime(2029, 12, 25).date(): 'Christmas',
}

def festival_flag(d):
    return 1 if d in custom_festivals else 0

def festival_name(d):
    return custom_festivals.get(d, 'None')

def holiday_flag(d):
    name = in_holidays.get(d)
    if not isinstance(name, str): return 0
    national = ['Republic Day', 'Independence Day', 'Gandhi Jayanti']
    return 1 if any(n in name for n in national) else 0

df['Is_Festival'] = df['Date'].dt.date.apply(festival_flag)
df['Festival_Name'] = df['Date'].dt.date.apply(festival_name)
df['Is_Holiday'] = df['Date'].dt.date.apply(holiday_flag)

# 4. Realistic sales generation -------------------------------------------
base = np.random.normal(80, 20, num_rows)
base -= df['Price'].values * 0.5                       # price elasticity
cat = df['Publication_Category']

# Category demand
base[cat == 'News Magazine'] += 30
base[cat == 'Fiction & Fantasy'] += 15
base[cat == 'Comic'] += 20
base[cat == 'Religious & Spiritual'] += 10
base[cat == 'History & Culture'] += 12
base[cat == 'Science & Technology'] += 8
base[cat == 'Fashion Magazine'] += 14
base[cat == 'Tech Magazine'] += 11
base[cat == 'Business Magazine'] += 13
base[cat == 'Sports Magazine'] += 16

# Promotions, events, festivals, holidays
# Promo effect scales with discount percentage
base[df['Promo_Discount'] > 0] += df['Promo_Discount'][df['Promo_Discount'] > 0] * np.random.uniform(1.5, 3.0, (df['Promo_Discount'] > 0).sum())
base[df['Special_Events'] != 'None'] += np.random.uniform(15, 40, num_rows)[df['Special_Events'] != 'None']
base[df['Is_Festival'] == 1] += np.random.uniform(15, 30, num_rows)[df['Is_Festival'] == 1]
base[(df['Is_Festival'] == 1) & (cat == 'Religious & Spiritual')] += np.random.uniform(40, 80, num_rows)[(df['Is_Festival'] == 1) & (cat == 'Religious & Spiritual')]
base[df['Is_Holiday'] == 1] += np.random.uniform(15, 30, num_rows)[df['Is_Holiday'] == 1]
base[(df['Is_Holiday'] == 1) & (cat == 'History & Culture')] += np.random.uniform(20, 40, num_rows)[(df['Is_Holiday'] == 1) & (cat == 'History & Culture')]

# Weekend behaviour by category
base[(df['Is_Weekend'] == 1) & (cat == 'News Magazine')] -= 5
base[(df['Is_Weekend'] == 1) & (cat == 'Comic')] += 25
base[(df['Is_Weekend'] == 1) & (cat == 'Sports Magazine')] += 20
base[(df['Is_Weekend'] == 1) & (cat == 'Fashion Magazine')] += 15
base[(df['Is_Weekend'] == 1) & (cat == 'Fiction & Fantasy')] += 10

# Demographic signal - makes the buyer-segment features genuinely predictive
base[(df['Income_Level'] == 'High') & cat.isin(['Fashion Magazine', 'Science & Technology', 'Business Magazine'])] += 7
base[df['Income_Level'] == 'Low'] -= 4
base[(df['Occupation'] == 'Professional') & cat.isin(['Business Magazine', 'Tech Magazine', 'Science & Technology'])] += 5
base[(df['Occupation'] == 'Student') & cat.isin(['Sports Magazine', 'Comic', 'Fiction & Fantasy'])] += 6
base[(df['Occupation'] == 'Student') & (cat == 'Business Magazine')] -= 4
base[(df['Occupation'] == 'Retired') & cat.isin(['News Magazine', 'Religious & Spiritual'])] += 5
base[df['Educational_Background'].isin(['Master', 'PhD']) & cat.isin(['Science & Technology', 'History & Culture'])] += 4
base[(df['Customer_Age'] < 30) & cat.isin(['Fashion Magazine', 'Sports Magazine', 'Tech Magazine', 'Comic'])] += 4
base[(df['Customer_Age'] > 55) & cat.isin(['News Magazine', 'Religious & Spiritual'])] += 5
base[(df['Customer_Age'] > 55) & (cat == 'Fashion Magazine')] -= 3

df['Sales_Quantity'] = np.clip(np.round(base + np.random.normal(0, 5, num_rows)).astype(int), 5, None)

# 5. Lagged features (exact: 1 row per Pub/Region/Date => shift(1)=yesterday)
df = df.sort_values(['Publication_Name', 'Region', 'Date'])
df['Previous_Day_Sales'] = df.groupby(['Publication_Name', 'Region'])['Sales_Quantity'].shift(1).bfill().astype(int)
df['Previous_Week_Sales'] = df.groupby(['Publication_Name', 'Region'])['Sales_Quantity'].shift(7).bfill().astype(int)
df = df.sort_values('Date').reset_index(drop=True)
df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')

# 6. Canonical column order (defines the trained feature order) ------------
columns = [
    'Date', 'Publication_Name', 'Publication_Category', 'Region', 'Customer_Age',
    'Income_Level', 'Educational_Background', 'Occupation', 'Season', 'Day_of_Week',
    'Is_Weekend', 'Is_Holiday', 'Is_Festival', 'Festival_Name', 'Special_Events', 'Promo_Discount', 'Price',
    'Previous_Day_Sales', 'Previous_Week_Sales', 'Sales_Quantity',
]
df = df[columns]

os.makedirs('artifacts', exist_ok=True)
output_path = os.path.join('artifacts', 'synthetic_sales_data.csv')
df.to_csv(output_path, index=False)

print(f"Saved {num_rows:,} rows -> {output_path}")
print(f"Avg sales: {df['Sales_Quantity'].mean():.0f} | min {df['Sales_Quantity'].min()} | max {df['Sales_Quantity'].max()}")
print(f"Special_Events distribution:\n{df['Special_Events'].value_counts().to_string()}")
print(f"Done in {round(time.time() - start_time, 2)}s")
