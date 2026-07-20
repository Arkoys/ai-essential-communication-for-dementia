export interface Resource {
  name: string;
  url: string;
  category: string;
}

export const RESOURCES: Resource[] = [
  // Cognitive Screening Tools
  { name: 'Mini Cog', url: 'https://mini-cog.com/', category: 'Cognitive Screening' },
  { name: 'AD-8', url: 'https://knightadrc.wustl.edu/professionals-clinicians/ad8-instrument/', category: 'Cognitive Screening' },
  { name: 'MoCA', url: 'http://mocacognition.com', category: 'Cognitive Screening' },
  { name: 'SLUMS', url: 'https://www.slu.edu/medicine/internal-medicine/geriatric-medicine/aging-successfully/mental-status-exam.php', category: 'Cognitive Screening' },
  { name: 'RUDAS', url: 'https://www.dementia.org.au/professionals/assessment-and-diagnosis-dementia/rowland-universal-dementia-assessment-scale-rudas', category: 'Cognitive Screening' },
  
  // Mood & Mental Health
  { name: 'PHQ-9', url: 'https://www.apa.org/depression-guideline/patient-health-questionnaire.pdf', category: 'Mood & Mental Health' },
  { name: 'GDS', url: 'https://geriatrictoolkit.missouri.edu/cog/GDS_SHORT_FORM.PDF', category: 'Mood & Mental Health' },
  { name: 'GAD-7', url: 'https://www.apaservices.org/practice/reimbursement/health-registry/anxiety-disorder-response.pdf', category: 'Mood & Mental Health' },
  { name: 'ASRS v1.1', url: 'https://psychology-tools.com/test/adult-adhd-self-report-scale', category: 'Mood & Mental Health' },
  
  // Functional Assessment
  { name: 'Katz Index', url: 'https://hign.org/sites/default/files/2020-06/Try_This_General_Assessment_2.pdf', category: 'Functional Assessment' },
  { name: 'Barthel Index', url: 'https://www.sralab.org/sites/default/files/2017-07/barthel.pdf', category: 'Functional Assessment' },
  { name: 'Lawton-Brody Scale', url: 'https://www.bgs.org.uk/sites/default/files/content/attachment/2018-07-05/lawton_brody.pdf', category: 'Functional Assessment' },
  { name: 'CDR Scale', url: 'https://knightadrc.wustl.edu/professionals-clinicians/cdr-dementia-staging-instrument/', category: 'Functional Assessment' },
  
  // Dementia-Specific
  { name: "Alzheimer's Association", url: 'https://www.alz.org/', category: 'Dementia Resources' },
  { name: 'Lewy Body Dementia Association', url: 'https://lbda.org/', category: 'Dementia Resources' },
  { name: 'Living Well With Dementia Toolkit', url: 'https://sites.google.com/ariadnelabs.org/living-with-dementia/', category: 'Dementia Resources' },
  
  // Medication & Safety
  { name: 'ACB Calculator', url: 'https://www.acbcalc.com/', category: 'Medication & Safety' },
  { name: 'STEADI Algorithm', url: 'https://www.cdc.gov/steadi/media/pdfs/STEADI-Algorithm-508.pdf', category: 'Medication & Safety' },
  
  // Psychiatric
  { name: 'PsychDB', url: 'https://www.psychdb.com/home', category: 'Psychiatric Comorbidity' },
  
  // Communication
  { name: 'Motivational Interviewing', url: 'https://motivationalinterviewing.org/', category: 'Communication' },
  { name: 'Motivational Interviewing (PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8200683/', category: 'Communication' },
  
  // Public Health
  { name: 'CDC BOLD Toolkit', url: 'https://www.cdc.gov/aging-programs/about/index.html', category: 'Public Health' },
  { name: 'Cognition in Primary Care', url: 'https://familymedicine.uw.edu/cpc/', category: 'Public Health' },
  
  // Geriatric Framework
  { name: '5Ms of Geriatric Care', url: 'https://www.aafp.org/afp/2024/0600/editorial-holistic-approach-geriatric-care', category: 'Geriatric Framework' },
];

// Group resources by category (for UI panel)
export const groupedResources = RESOURCES.reduce((acc, resource) => {
  if (!acc[resource.category]) {
    acc[resource.category] = [];
  }
  acc[resource.category].push(resource);
  return acc;
}, {} as Record<string, Resource[]>);

// Generate markdown list from RESOURCES (for AI citation - positive list)
export function generatePositiveCitationList(): string {
  return RESOURCES.map(r => `- [${r.name}](${r.url})`).join('\n');
}

// Curated External Resources string for AI citation (legacy format)
export const CURATED_EXTERNAL_RESOURCES = `Curated External Resources - Use markdown link format [Name](URL) in responses:

Cognitive Screening Tools:
[Mini Cog](https://mini-cog.com/)
[AD-8](https://knightadrc.wustl.edu/professionals-clinicians/ad8-instrument/)
[MoCA](http://mocacognition.com)
[SLUMS](https://www.slu.edu/medicine/internal-medicine/geriatric-medicine/aging-successfully/mental-status-exam.php)
[RUDAS](https://www.dementia.org.au/professionals/assessment-and-diagnosis-dementia/rowland-universal-dementia-assessment-scale-rudas)

Mood & Mental Health Assessments:
[PHQ-9](https://www.apa.org/depression-guideline/patient-health-questionnaire.pdf)
[GDS](https://geriatrictoolkit.missouri.edu/cog/GDS_SHORT_FORM.PDF)
[GAD-7](https://www.apaservices.org/practice/reimbursement/health-registry/anxiety-disorder-response.pdf)
[ASRS v1.1](https://psychology-tools.com/test/adult-adhd-self-report-scale)

Functional Assessment Tools:
[Katz Index](https://hign.org/sites/default/files/2020-06/Try_This_General_Assessment_2.pdf)
[Barthel Index](https://www.sralab.org/sites/default/files/2017-07/barthel.pdf)
[Lawton-Brody Scale](https://www.bgs.org.uk/sites/default/files/content/attachment/2018-07-05/lawton_brody.pdf)
[CDR Scale](https://knightadrc.wustl.edu/professionals-clinicians/cdr-dementia-staging-instrument/)

Dementia-Specific Resources:
[Alzheimer's Association](https://www.alz.org/)
[Lewy Body Dementia Association](https://lbda.org/)
[Living Well With Dementia Toolkit](https://sites.google.com/ariadnelabs.org/living-with-dementia/)

Medication & Safety Tools:
[ACB Calculator](https://www.acbcalc.com/)
[STEADI Algorithm](https://www.cdc.gov/steadi/media/pdfs/STEADI-Algorithm-508.pdf)

Psychiatric Comorbidity:
[PsychDB](https://www.psychdb.com/home)

Communication & Interviewing:
[Motivational Interviewing](https://motivationalinterviewing.org/)
[Motivational Interviewing (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8200683/)

Public Health & Program Resources:
[CDC BOLD Toolkit](https://www.cdc.gov/aging-programs/about/index.html)
[Cognition in Primary Care](https://familymedicine.uw.edu/cpc/)

Geriatric Care Framework:
[5Ms of Geriatric Care](https://www.aafp.org/afp/2024/0600/editorial-holistic-approach-geriatric-care)`;
