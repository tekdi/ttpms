from datetime import date, datetime

def calculate_experience(user_dict):
    today = date.today()
    total_exp_from_db = user_dict.get("total_experience")

    # Convert stored total_experience to float (assuming it is years like "2.5")
    try:
        previous_exp = float(total_exp_from_db) if total_exp_from_db else 0.0
    except ValueError:
        previous_exp = 0.0

    # Calculate difference between today and date_of_joining
    doj = user_dict.get("date_of_joining")
    if doj:
        if isinstance(doj, str):
            doj = datetime.strptime(doj, "%Y-%m-%d").date()
        diff_days = (today - doj).days
        current_exp = diff_days / 365.0   # convert days into years
    else:
        current_exp = 0.0

    total_experience = previous_exp + current_exp
    return round(total_experience, 2)