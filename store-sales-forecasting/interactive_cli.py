import sys
import os

# Ensure the src directory is available
sys.path.append(os.getcwd())

from src.pipelines.dual_prediction_pipeline import DualPredictionPipeline

def main():
    print("="*60)
    print("🤖 NEXUS TERMINAL AI FORECASTER (SVR + LightGBM)")
    print("="*60)
    
    try:
        print("\nLoading AI models into memory... ", end="", flush=True)
        pipeline = DualPredictionPipeline()
        print("[SUCCESS]")
    except Exception as e:
        print(f"[FAILED]\nError: {e}")
        return
        
    print("\nPlease enter the parameters for your prediction.")
    print("-" * 50)
    
    pub_name = input("Publication Name (e.g. 'The Daily News'): ") or "The Daily News"
    pub_cat = input("Publication Category (e.g. 'News', 'Fashion'): ") or "News"
    price_str = input("Price (e.g. 15.0): ") or "15.0"
    age_str = input("Target Customer Age (18-75): ") or "35"
    income = input("Income Level (Low/Medium/High): ") or "Medium"
    edu = input("Educational Background (High School/Bachelor/Master/PhD): ") or "Bachelor"
    occ = input("Occupation (Student/Professional/Business/Retired): ") or "Professional"
    region = input("Region (North/South/East/West): ") or "North"
    promo_str = input("Active Promotion? (1 for Yes, 0 for No): ") or "0"
    events = input("Special Events (None/Election Day/Mega Sale/etc.): ") or "None"
    prev_day_str = input("Previous Day Sales (e.g. 500): ") or "500"
    prev_week_str = input("Previous Week Sales (e.g. 520): ") or "520"
    
    params = {
        "publication_name": pub_name,
        "publication_category": pub_cat,
        "price": float(price_str),
        "customer_age": int(age_str),
        "income_level": income,
        "educational_background": edu,
        "occupation": occ,
        "region": region,
        "promotion": int(promo_str),
        "special_events": events,
        "previous_day_sales": int(prev_day_str),
        "previous_week_sales": int(prev_week_str)
    }
    
    print("\n" + "="*60)
    print("🧠 AI PREDICTION RESULTS")
    print("="*60)
    
    try:
        results = pipeline.compare(**params)
        
        lgbm = results['lgbm']
        svr = results['svr']
        delta = abs(lgbm - svr)
        
        print(f" LightGBM Forecast : {lgbm:.0f} copies sold")
        print(f" SVR Forecast      : {svr:.0f} copies sold")
        print(f" Model Difference  : {delta:.0f} copies")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error making prediction: {e}")

if __name__ == "__main__":
    main()
