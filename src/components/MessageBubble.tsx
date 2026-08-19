import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { User, Stethoscope, Zap, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStuck?: boolean;
  isInsufficientInfo?: boolean;
}

// Curated Resources keywords with their URLs for auto-linking
const CURATED_KEYWORDS: { keywords: string[]; url: string }[] = [
  { keywords: ["Mini Cog", "MiniCog"], url: "https://mini-cog.com/" },
  { keywords: ["AD-8"], url: "https://knightadrc.wustl.edu/professionals-clinicians/ad8-instrument/" },
  { keywords: ["MoCA", "MOCA"], url: "http://mocacognition.com" },
  { keywords: ["SLUMS"], url: "https://www.slu.edu/medicine/internal-medicine/geriatric-medicine/aging-successfully/mental-status-exam.php" },
  { keywords: ["RUDAS"], url: "https://www.dementia.org.au/professionals/assessment-and-diagnosis-dementia/rowland-universal-dementia-assessment-scale-rudas" },
  { keywords: ["PHQ-9", "PHQ9"], url: "https://www.apa.org/depression-guideline/patient-health-questionnaire.pdf" },
  { keywords: ["GDS", "Geriatric Depression Scale"], url: "https://geriatrictoolkit.missouri.edu/cog/GDS_SHORT_FORM.PDF" },
  { keywords: ["GAD-7", "GAD7"], url: "https://www.apaservices.org/practice/reimbursement/health-registry/anxiety-disorder-response.pdf" },
  { keywords: ["ASRS v1.1", "ASRS"], url: "https://psychology-tools.com/test/adult-adhd-self-report-scale" },
  { keywords: ["Katz Index", "Katz index"], url: "https://hign.org/sites/default/files/2020-06/Try_This_General_Assessment_2.pdf" },
  { keywords: ["Barthel Index", "Barthel index"], url: "https://www.sralab.org/sites/default/files/2017-07/barthel.pdf" },
  { keywords: ["Lawton-Brody", "Lawton Brody", "Lawton-Brody Scale"], url: "https://www.bgs.org.uk/sites/default/files/content/attachment/2018-07-05/lawton_brody.pdf" },
  { keywords: ["CDR Scale", "Clinical Dementia Rating Scale", "CDR"], url: "https://knightadrc.wustl.edu/professionals-clinicians/cdr-dementia-staging-instrument/" },
  { keywords: ["Alzheimer's Association", "Alzheimer Association"], url: "https://www.alz.org/" },
  { keywords: ["Lewy Body Dementia Association", "Lewy Body"], url: "https://lbda.org/" },
  { keywords: ["Living Well With Dementia Toolkit", "Living Well With Dementia"], url: "/documents" },
  { keywords: ["ACB Calculator", "ACB calc"], url: "https://www.acbcalc.com/" },
  { keywords: ["STEADI Algorithm", "STEADI"], url: "https://www.cdc.gov/steadi/media/pdfs/STEADI-Algorithm-508.pdf" },
  { keywords: ["PsychDB"], url: "https://www.psychdb.com/home" },
  { keywords: ["Motivational Interviewing", "MINT"], url: "https://motivationalinterviewing.org/" },
  { keywords: ["Motivational Interviewing Paper"], url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8200683/" },
  { keywords: ["CDC BOLD Toolkit", "BOLD Toolkit", "CDC BOLD"], url: "https://www.cdc.gov/aging-programs/about/index.html" },
  { keywords: ["Cognition in Primary Care", "CPC"], url: "https://familymedicine.uw.edu/cpc/" },
  { keywords: ["Mayo Clinic"], url: "https://www.mayoclinic.org/" },
  { keywords: ["5Ms", "5 Ms", "5Ms of Geriatric Care", "5 Ms Framework"], url: "https://www.aafp.org/afp/2024/0600/editorial-holistic-approach-geriatric-care" },
];

// Pre-processor: Convert keyword mentions to markdown links BEFORE ReactMarkdown parsing
function preprocessContent(content: string): string {
  let result = content;
  
  for (const item of CURATED_KEYWORDS) {
    for (const keyword of item.keywords) {
      // Skip if keyword already appears to be in a markdown link (preceded by [)
      // This is a simple heuristic - if the line has [keyword] it's likely already linked
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match keyword that is NOT already inside square brackets
      // Use a flexible pattern that allows for colons after the keyword
      // Negative lookbehind for [ ensures we're not inside an existing link
      // Only consume trailing spaces and colons, NOT newlines (to preserve line breaks)
      const pattern = new RegExp(`(?<!\\[)\\b${escapedKeyword}\\b[ ]*(?::[ ]*)?`, 'gi');
      result = result.replace(pattern, `[${keyword}](${item.url})`);
    }
  }
  
  return result;
}

export function MessageBubble({ role, content, isStuck, isInsufficientInfo }: MessageBubbleProps) {
  const isUser = role === 'user';
  
  // Preprocess content to convert keywords to markdown links
  const processedContent = preprocessContent(content);

  return (
    <div
      className={cn(
        "flex w-full py-6",
        isUser 
          ? "bg-white dark:bg-zinc-950" 
          : isStuck 
            ? "bg-green-50 dark:bg-green-900/20" 
            : isInsufficientInfo
              ? "bg-amber-50 dark:bg-amber-900/20"
              : "bg-zinc-50 dark:bg-zinc-900"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-6 w-full px-4">
        <div className="shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <User size={18} />
            </div>
          ) : (
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isStuck 
                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" 
                : isInsufficientInfo
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            )}>
              {isStuck ? <Zap size={18} /> : isInsufficientInfo ? <AlertCircle size={18} /> : <Stethoscope size={18} />}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className={cn(
            "font-semibold text-sm",
            isUser 
              ? "text-zinc-800 dark:text-zinc-200" 
              : isStuck 
                ? "text-green-800 dark:text-green-200" 
                : isInsufficientInfo
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-zinc-800 dark:text-zinc-200"
          )}>
            {isUser 
              ? 'You' 
              : isStuck 
                ? 'Stuck Mode Coach' 
                : isInsufficientInfo
                  ? 'Coach (needs more info)'
                  : 'Clinical Coach'}
          </div>
          <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2
                    className={cn(
                      "font-semibold text-sm mt-4 mb-1 text-orange-800 dark:text-orange-200",
                      isStuck && "text-green-800 dark:text-green-200",
                      isInsufficientInfo && "text-amber-800 dark:text-amber-200"
                    )}
                  >
                    {children}
                  </h2>
                ),
                strong: ({ children }) => (
                  <strong
                    className={cn(
                      "font-semibold text-orange-800 dark:text-orange-200",
                      isStuck && "text-green-800 dark:text-green-200",
                      isInsufficientInfo && "text-amber-800 dark:text-amber-200"
                    )}
                  >
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-none space-y-0.5 pl-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-4 space-y-0.5">
                    {children}
                  </ol>
                ),
                li: ({ children, node }) => {
                  // Check if this is a paragraph-style list item (has nested paragraphs)
                  // This allows ReactMarkdown to properly parse URLs within list items
                  const hasParagraphChildren = node?.children?.some(
                    (child: any) => child.type === 'paragraph'
                  );
                  
                  return (
                    <li className="pl-4 relative before:content-['•'] before:absolute before:left-0 text-zinc-700 dark:text-zinc-300">
                      {hasParagraphChildren ? children : <p className="text-zinc-700 dark:text-zinc-300">{children}</p>}
                    </li>
                  );
                },
                p: ({ children }) => (
                  <p className="text-zinc-700 dark:text-zinc-300">
                    {children}
                  </p>
                ),
                a: ({ href, children }) => {
                  // Check if this URL exactly matches any curated keyword URL
                  const isAllowedUrl = CURATED_KEYWORDS.some(
                    item => item.url === href
                  );
                  
                  // If URL is not from our curated list, render as plain text
                  if (!isAllowedUrl) {
                    return <span>{children}</span>;
                  }
                  
                  return (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
