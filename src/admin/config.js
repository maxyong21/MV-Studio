export const entityConfig = {
  services: { title: 'Services & pricing', singular: 'service', fields: [
    ['name','Name','text'],['category','Eyebrow / tier','text'],['price','Sale price (RM)','number'],['original_price','Original price (RM)','number'],['summary','Description','textarea'],['features','Deliverables (one per line)','lines'],['timeline','Delivery estimate','text'],['scope','Page count and scope','textarea'],['revisions','Revision policy','textarea'],['third_party_costs','Hosting, domain and other third-party charges','textarea'],['maintenance_terms','Maintenance and recurring costs','textarea'],['support_terms','After-launch support','textarea'],['payment_terms','Payment terms','textarea'],['active','Visible on website','checkbox'],['sort_order','Display order','number'],
  ]},
  projects: { title: 'Projects', singular: 'project', fields: [
    ['name','Project name','text'],['category','Project type','text'],['summary','Description','textarea'],['challenge','Case study: the challenge','textarea'],['solution','Case study: our approach','textarea'],['outcome','Case study: outcome (verified facts only)','textarea'],['seo_title','Search title','text'],['seo_description','Search description','textarea'],['image_url','Image path or URL','text'],['demo_url','Demo / detail page URL','text'],['video_url','Demo video · YouTube URL or Supabase video URL','text'],['tags','Technology tags (one per line)','lines'],['featured','Featured project','checkbox'],['show_in_footer','Show in footer (maximum 4)','checkbox'],['active','Visible on website','checkbox'],['sort_order','Display order','number'],
  ]},
  team_members: { title: 'Team', singular: 'team member', fields: [
    ['name','Name','text'],['role','Role','text'],['bio','Biography','textarea'],['image_url','Photo path or URL','text'],['linkedin_url','LinkedIn URL','text'],['github_url','GitHub URL','text'],['website_url','Website URL','text'],['active','Visible on website','checkbox'],['sort_order','Display order','number'],
  ]},
  promotions: { title: 'Promotions', singular: 'promotion', fields: [
    ['title','Headline','text'],['message','Offer details','textarea'],['button_label','Button label','text'],['button_url','Button link','text'],['image_url','Image path or URL (optional)','text'],['enabled','Popup enabled','checkbox'],['active','Published','checkbox'],['starts_at','Starts at (optional)','datetime-local'],['ends_at','Ends at (optional)','datetime-local'],
  ]},
  feature_options: { title: 'Enquiry features', singular: 'feature', fields: [
    ['name','Feature name','text'],['description','Description','textarea'],['category','Category','select:core|third_party|maintenance'],['billing_type','Billing type','select:one_time|monthly|quote'],['price','Price (RM)','number'],['annual_free_months','Free months on annual plan','number'],['active','Available to customers','checkbox'],['sort_order','Display order','number'],
  ]},
  testimonials: { title: 'Client feedback', singular: 'testimonial', fields: [
    ['name','Client name','text'],['company_name','Company name','text'],['role','Role (optional)','text'],['quote','Client quote','textarea'],['project_url','Related project URL (optional)','text'],['permission_confirmed','Permission to publish this quote has been confirmed','checkbox'],['active','Publish on website','checkbox'],['sort_order','Display order','number'],
  ]},
};
