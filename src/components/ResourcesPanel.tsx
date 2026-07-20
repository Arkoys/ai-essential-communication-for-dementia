import React from 'react';
import { X, ExternalLink, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';

interface Resource {
  name: string;
  url: string;
  category: string;
}

const RESOURCES: Resource[] = [
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

// Group resources by category
const groupedResources = RESOURCES.reduce((acc, resource) => {
  if (!acc[resource.category]) {
    acc[resource.category] = [];
  }
  acc[resource.category].push(resource);
  return acc;
}, {} as Record<string, Resource[]>);

interface ResourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResourcesPanel({ isOpen, onClose }: ResourcesPanelProps) {
  const handleResourceClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out w-80 max-w-[90vw] bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-700",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-1 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-orange-600 dark:text-orange-400" />
            <h2 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Resources</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto h-[calc(100dvh-49px)] p-2 space-y-5">
          {Object.entries(groupedResources).map(([category, resources]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                {category}
              </h3>
              <ul className="space-y-1">
                {resources.map((resource) => (
                  <li key={resource.url}>
                    <button
                      onClick={() => handleResourceClick(resource.url)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors group"
                    >
                      <span className="text-sm font-medium truncate">{resource.name}</span>
                      <ExternalLink 
                        size={14} 
                        className="shrink-0 text-zinc-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" 
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
