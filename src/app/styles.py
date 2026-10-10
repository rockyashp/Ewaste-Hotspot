"""
UI/UX Styles and Theme Tokens for E-Waste GIS Platform
Adheres strictly to serious environmental intelligence aesthetics:
Clean light palette, subtle environmental tones, high data legibility, no neon/gimmicks.
"""

CUSTOM_CSS = """
<style>
    /* Global Typography & Background */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #1E293B;
    }
    
    .stApp {
        background-color: #F8FAFC;
    }
    
    /* Header Container */
    .platform-header {
        background: #FFFFFF;
        border-bottom: 1px solid #E2E8F0;
        padding: 1.25rem 2rem;
        margin-bottom: 1.5rem;
    }
    .platform-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0F172A;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }
    .platform-subtitle {
        font-size: 0.875rem;
        color: #64748B;
        margin-top: 0.25rem;
        margin-bottom: 0;
    }
    
    /* Metric Cards */
    .kpi-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 1rem 1.2rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .kpi-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748B;
        margin-bottom: 0.25rem;
    }
    .kpi-value {
        font-size: 1.6rem;
        font-weight: 700;
        color: #0F172A;
        line-height: 1.2;
    }
    .kpi-sub {
        font-size: 0.75rem;
        color: #059669;
        margin-top: 0.2rem;
        font-weight: 500;
    }
    
    /* Status Badges */
    .badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 600;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
    .badge-high {
        background-color: #FEE2E2;
        color: #991B1B;
        border: 1px solid #FECACA;
    }
    .badge-medium {
        background-color: #FEF3C7;
        color: #92400E;
        border: 1px solid #FDE68A;
    }
    .badge-low {
        background-color: #D1FAE5;
        color: #065F46;
        border: 1px solid #A7F3D0;
    }
    .badge-critical-gap {
        background-color: #FEE2E2;
        color: #991B1B;
        border: 1px solid #FECACA;
    }
    .badge-mod-gap {
        background-color: #FEF3C7;
        color: #92400E;
        border: 1px solid #FDE68A;
    }
    .badge-served {
        background-color: #E0E7FF;
        color: #3730A3;
        border: 1px solid #C7D2FE;
    }
    
    /* Panel Card */
    .detail-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 1.25rem;
        margin-bottom: 1rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .detail-card h4 {
        margin-top: 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: #0F172A;
        border-bottom: 1px solid #F1F5F9;
        padding-bottom: 0.5rem;
        margin-bottom: 0.8rem;
    }
    
    /* Policy Callout */
    .policy-callout {
        background: #F0FDF4;
        border-left: 4px solid #10B981;
        padding: 1rem;
        border-radius: 0 6px 6px 0;
        margin-top: 0.75rem;
    }
    .policy-callout-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: #065F46;
        margin-bottom: 0.3rem;
    }
    .policy-callout-body {
        font-size: 0.825rem;
        color: #1F2937;
        line-height: 1.5;
    }
    
    /* Compact Data Table Styling */
    .dataframe {
        font-size: 0.8rem !important;
        border: 1px solid #E2E8F0 !important;
    }
    
    /* Streamlit overrides */
    div[data-testid="stSidebar"] {
        background-color: #FFFFFF;
        border-right: 1px solid #E2E8F0;
    }
    div[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p {
        font-size: 0.85rem;
    }
    .block-container {
        padding-top: 1.5rem !important;
        padding-bottom: 3rem !important;
        max-width: 96% !important;
    }
</style>
"""
