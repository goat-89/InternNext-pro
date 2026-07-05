const roles = [
  ['Data Science Intern','Data Science',['Python','Pandas','SQL']],['Frontend Developer Intern','Web Development',['React','JavaScript','Tailwind']],
  ['Java Backend Intern','Java Developer',['Java','Spring Boot','SQL']],['Python Automation Intern','Python Developer',['Python','Selenium','Git']],
  ['Full Stack Intern','Full Stack Developer',['React','Node.js','MongoDB']],['UI/UX Design Intern','UI/UX Design',['Figma','Research','Prototyping']],
  ['AI/ML Research Intern','AI/ML',['Python','PyTorch','NLP']],['Cybersecurity Analyst Intern','Cybersecurity',['Linux','SIEM','Networking']],
  ['Cloud Engineering Intern','Cloud Computing',['AWS','Docker','Linux']],['DevOps Intern','DevOps',['Docker','CI/CD','Kubernetes']],
  ['Android Developer Intern','Android Development',['Kotlin','Android Studio','Firebase']],['QA Automation Intern','Software Testing',['Selenium','Postman','Java']],
  ['Business Analyst Intern','Business Analyst',['Excel','SQL','Power BI']],['Digital Marketing Intern','Digital Marketing',['SEO','Analytics','Content']],
  ['Content Writing Intern','Content Writing',['Writing','SEO','Research']]
]
const companies = ['NeuralGrid','PixelForge','CoreStack','SecureNest','CloudArc','BrightLoop','DataNova','AppMint','GrowthPilot','OrbitWorks','Zenith Labs','BluePeak']
const locations = ['Remote','Pune','Bengaluru','Mumbai','Hyderabad','Delhi NCR','Chennai','Nashik']
export const categories = roles.map(r=>r[1])
export const internships = Array.from({length:36},(_,i)=>{
  const r=roles[i%roles.length], company=companies[i%companies.length], remote=i%4===0
  return {id:String(i+1),title:r[0],category:r[1],skills:r[2],company,logo:company.slice(0,2).toUpperCase(),location:remote?'Remote':locations[i%locations.length],mode:remote?'Remote':i%3===0?'Hybrid':'Onsite',stipend:12000+(i%8)*3000,duration:`${3+i%4} months`,openings:1+i%5,experience:i%3===0?'Beginner':'Intermediate',companyType:i%2?'Startup':'Enterprise',deadline:`2026-${String(7+(i%4)).padStart(2,'0')}-${String(10+(i%18)).padStart(2,'0')}`,posted:`${1+i%12} days ago`,featured:i%6===0,description:`Join ${company} to work on meaningful ${r[1].toLowerCase()} projects with experienced mentors, structured feedback, and measurable learning outcomes.`,responsibilities:['Build production-quality deliverables','Collaborate with mentors and peers','Document progress and present outcomes'],eligibility:'Students or recent graduates with relevant foundational skills.',perks:['Certificate','Mentorship',i%3===0?'PPO opportunity':'Flexible hours'],preferredSkills:r[2].slice(0,2),screening:['Profile review','Practical assignment','Final discussion']}
})
export const applications = internships.slice(0,9).map((x,i)=>({id:i+1,internshipId:x.id,title:x.title,company:x.company,status:['Applied','Under Review','Shortlisted','Interview Scheduled','Selected','Rejected'][i%6],date:`2026-06-${String(2+i).padStart(2,'0')}`}))
export const notifications = Array.from({length:10},(_,i)=>({id:i+1,title:['Application update','New matching internship','Interview reminder','Profile suggestion'][i%4],body:`A useful update is available for your InternNext account.`,time:`${i+1}h ago`,read:i>3}))
export const testimonials = [
  ['Aarav Shah','Student','InternNext helped me move from applications to a PPO in four months.'],['Diya Mehta','Student','The recommendation score made my search much more focused.'],
  ['Rohan Kulkarni','Recruiter','We shortlisted strong candidates in half the usual time.'],['Sara Khan','Student','The resume review improved both clarity and ATS performance.'],['Nikhil Rao','Founder','The employer analytics make every listing measurable.']
]
export const faqs = [
  ['Are internships verified?','Listings pass moderation checks before appearing publicly.'],['Is applying free?','Students can browse, save, and apply for standard internships at no cost.'],
  ['How do premium plans work?','Premium plans add career services such as resume review, mentorship, and interview preparation.'],['Can employers manage candidates?','Yes. Employers can filter, shortlist, reject, and move candidates through a hiring pipeline.'],
  ['How are payments handled?','The production integration should use a verified payment gateway and server-side webhook validation.'],['Can I delete my account?','Account deletion is available from settings and requires confirmation.']
]
export const plans = {
  student:[{name:'Starter',price:0,features:['Unlimited browsing','Save internships','Application tracking']},{name:'Career Pro',price:1499,popular:true,features:['ATS resume review','Mock interview','Career mentorship','Featured profile']},{name:'Placement Max',price:2999,features:['Everything in Pro','DSA mentoring','Certification bundle','Priority support']}],
  employer:[{name:'Single Post',price:999,features:['1 internship listing','Applicant dashboard','30-day visibility']},{name:'Growth',price:3499,popular:true,features:['10 active listings','Featured placement','Hiring analytics','Priority support']},{name:'Scale',price:7999,features:['Unlimited listings','Company spotlight','Advanced analytics','Account manager']}]
}
export const chartData = ['Jan','Feb','Mar','Apr','May','Jun'].map((month,i)=>({month,applications:420+i*170,revenue:32000+i*14500,views:2600+i*650}))
