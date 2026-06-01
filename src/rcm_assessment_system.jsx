import React, { useState, useRef, useEffect } from 'react';

const RCMAssessment = () => {
  // ============ STATE MANAGEMENT ============
  const [stage, setStage] = useState('intro'); // intro, participant-info, assessment, processing, complete
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    company: '',
    role: '',
    responsibilities: ''
  });
  
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [assessmentData, setAssessmentData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // ============ ASSESSMENT QUESTIONS DATABASE ============
  const assessmentAreas = {
    'Patient Access & Intake': {
      priority: 1,
      questions: [
        { step: 'Pre-Registration', question: "Walk me through how 'Pre-Registration' works today from beginning to end. Tell me who is involved, what systems support it, where people intervene, how decisions are made, what metrics matter, and what challenges or improvement attempts exist." },
        { step: 'Scheduling', question: "Walk me through how 'Scheduling' works today..." },
        { step: 'Insurance Capture', question: "Walk me through how 'Insurance Capture' works today..." },
      ]
    },
    'Coding & Charge Capture': {
      priority: 2,
      questions: [
        { step: 'Documentation Intake', question: "Walk me through how 'Documentation Intake' works today..." },
        { step: 'Code Assignment', question: "Walk me through how 'Code Assignment' works today..." },
      ]
    },
    'Claims Management': {
      priority: 3,
      questions: [
        { step: 'Claim Creation', question: "Walk me through how 'Claim Creation' works today..." },
        { step: 'Submission', question: "Walk me through how 'Submission' works today..." },
      ]
    },
    'Payment Processing': {
      priority: 4,
      questions: [
        { step: 'Payment Receipt', question: "Walk me through how 'Payment Receipt' works today..." },
        { step: 'Payment Posting', question: "Walk me through how 'Payment Posting' works today..." },
      ]
    },
    'Denials & Appeals': {
      priority: 5,
      questions: [
        { step: 'Denial Identification', question: "Walk me through how 'Denial Identification' works today..." },
      ]
    },
    'Accounts Receivable': {
      priority: 6,
      questions: [
        { step: 'AR Inventory Review', question: "Walk me through how 'AR Inventory Review' works today..." },
      ]
    },
    'Patient Billing & Collections': {
      priority: 7,
      questions: [
        { step: 'Patient Balance Generation', question: "Walk me through how 'Patient Balance Generation' works today..." },
      ]
    }
  };

  const roleAreaMapping = {
    'VP Revenue Cycle': ['Patient Access & Intake', 'Coding & Charge Capture', 'Claims Management'],
    'Director Revenue Cycle': ['Patient Access & Intake', 'Coding & Charge Capture'],
    'Manager': ['Coding & Charge Capture'],
    'Specialist': ['Coding & Charge Capture'],
    'Analytics / QA': ['Patient Access & Intake', 'Claims Management', 'Payment Processing']
  };

  // ============ HELPER FUNCTIONS ============
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  const getDynamicProgress = () => {
    if (currentQuestionIndex === 0) return 'We\'re getting started.';
    if (currentQuestionIndex <= 2) return 'We\'ve covered a good portion already.';
    if (currentQuestionIndex <= 5) return 'We\'re roughly halfway through.';
    if (currentQuestionIndex <= 8) return 'We\'re getting close.';
    return 'We\'re in the final stretch.';
  };

  const extractEvidence = (response) => {
    const targets = ['Process', 'Roles', 'FTE', 'Systems', 'Automation', 'KPIs', 'Constraints', 'Governance', 'Failed Initiatives', 'AI Appetite', 'Outsourcing Appetite'];
    return {
      response: response,
      extracted: targets,
      confidence: response.length > 200 ? 'HIGH' : response.length > 50 ? 'MEDIUM' : 'LOW'
    };
  };

  // ============ STAGE: INTRODUCTION ============
  const handleStartAssessment = () => {
    setStage('participant-info');
  };

  // ============ STAGE: PARTICIPANT INFO ============
  const handleParticipantInfoSubmit = () => {
    if (!participantInfo.name || !participantInfo.company || !participantInfo.role) {
      alert('Please fill in all required fields.');
      return;
    }

    const relevantAreas = roleAreaMapping[participantInfo.role] || [];
    setSelectedAreas(relevantAreas);
    setStage('assessment');
    setProgress(0);
  };

  // ============ STAGE: ASSESSMENT ============
  const getCurrentQuestion = () => {
    let questionCount = 0;
    for (const area of selectedAreas) {
      const areaQuestions = assessmentAreas[area].questions;
      if (questionCount + areaQuestions.length > currentQuestionIndex) {
        const indexInArea = currentQuestionIndex - questionCount;
        return {
          area,
          question: areaQuestions[indexInArea],
          isLast: currentQuestionIndex === getTotalQuestions() - 1
        };
      }
      questionCount += areaQuestions.length;
    }
    return null;
  };

  const getTotalQuestions = () => {
    return selectedAreas.reduce((sum, area) => sum + assessmentAreas[area].questions.length, 0);
  };

  const handleResponseSubmit = async () => {
    if (!currentResponse.trim()) return;

    const current = getCurrentQuestion();
    if (!current) return;

    setIsLoading(true);

    // Add user response
    setConversationHistory([
      ...conversationHistory,
      { role: 'user', content: currentResponse }
    ]);

    // Extract evidence
    const evidence = extractEvidence(currentResponse);
    setAssessmentData([
      ...assessmentData,
      {
        questionNumber: currentQuestionIndex + 1,
        area: current.area,
        processStep: current.question.step,
        question: current.question.question,
        response: currentResponse,
        evidence: evidence,
        timestamp: new Date().toISOString()
      }
    ]);

    // Call Claude API for follow-up or confirmation
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: `You are Anthony, an RCM assessment consultant. The participant just responded to this question about "${current.question.step}":

Question: "${current.question.question}"

Response: "${currentResponse}"

Determine if the response contains sufficient evidence about: roles, systems, automation, KPIs, governance, bottlenecks. If missing key information, ask ONE concise follow-up question (max 50 words). If the response is complete, just say "NEXT" to move to the next question.`
            }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = data.content[0].text;

      if (assistantMessage.includes('NEXT')) {
        // Move to next question
        if (current.isLast) {
          setStage('processing');
        } else {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setProgress(Math.round(((currentQuestionIndex + 1) / getTotalQuestions()) * 100));
        }
      } else {
        // Show follow-up
        setConversationHistory(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (error) {
      console.error('Error calling Claude API:', error);
      // Fallback: proceed to next question
      if (current.isLast) {
        setStage('processing');
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setProgress(Math.round(((currentQuestionIndex + 1) / getTotalQuestions()) * 100));
      }
    }

    setCurrentResponse('');
    setIsLoading(false);
  };

  const generateDocx = async () => {
    try {
      setExportStatus('Generating assessment package...');
      
      // Create simple text export (in production, would use docx library)
      const assessmentPackage = {
        section1: {
          title: 'PARTICIPANT INFORMATION',
          data: participantInfo
        },
        section2: {
          title: 'ASSESSMENT CONVERSATION LOG',
          data: assessmentData
        },
        section3: {
          title: 'EXTRACTED OBSERVATIONS',
          data: assessmentData.map(item => ({
            question: item.processStep,
            response: item.response.substring(0, 300) + '...',
            confidence: item.evidence.confidence
          }))
        },
        section4: {
          title: 'ASSESSMENT METADATA',
          data: {
            questionsAsked: assessmentData.length,
            areasExplored: selectedAreas.length,
            completionDate: new Date().toLocaleDateString(),
            completionTime: new Date().toLocaleTimeString()
          }
        }
      };

      // Create downloadable JSON (represents what would be in DOCX)
      const dataStr = JSON.stringify(assessmentPackage, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `RCM_Assessment_${participantInfo.company}_${participantInfo.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      setExportStatus('✓ Assessment package ready for download!');
      setTimeout(() => setStage('complete'), 1500);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('Error generating package. Please try again.');
    }
  };

  // ============ RENDER STAGES ============
  return (
    <div style={{
      fontFamily: 'var(--font-sans)',
      maxWidth: '700px',
      margin: '0 auto',
      padding: '2rem 1rem',
      color: 'var(--color-text-primary)'
    }}>
      {/* STAGE: INTRO */}
      {stage === 'intro' && (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '1rem', fontWeight: '500' }}>
            Welcome — I'm Anthony
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
            I'm your RCM Assessment Consultant. I use structured operational frameworks to understand how your Revenue Cycle organization works today and capture evidence for deeper analysis.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            This usually takes around <strong>10–15 minutes</strong> depending on your role and the depth of your answers. There's nothing to prepare — practical examples and how things actually work today are most valuable.
          </p>
          <button 
            onClick={handleStartAssessment}
            style={{
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: '500',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-background-primary)',
              cursor: 'pointer',
              color: 'var(--color-text-primary)'
            }}
          >
            Let's Get Started
          </button>
        </div>
      )}

      {/* STAGE: PARTICIPANT INFO */}
      {stage === 'participant-info' && (
        <div style={{ padding: '2rem 0' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '1.5rem', fontWeight: '500' }}>
            Before we start, tell me about yourself
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Your name"
              value={participantInfo.name}
              onChange={(e) => setParticipantInfo({ ...participantInfo, name: e.target.value })}
              style={{ padding: '10px 12px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)' }}
            />
            <input
              type="text"
              placeholder="Company name"
              value={participantInfo.company}
              onChange={(e) => setParticipantInfo({ ...participantInfo, company: e.target.value })}
              style={{ padding: '10px 12px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)' }}
            />
            <select
              value={participantInfo.role}
              onChange={(e) => setParticipantInfo({ ...participantInfo, role: e.target.value })}
              style={{ padding: '10px 12px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)' }}
            >
              <option value="">Select your role</option>
              <option value="VP Revenue Cycle">VP Revenue Cycle</option>
              <option value="Director Revenue Cycle">Director Revenue Cycle</option>
              <option value="Manager">Manager</option>
              <option value="Specialist">Specialist</option>
              <option value="Analytics / QA">Analytics / QA</option>
            </select>
            <textarea
              placeholder="What are your and your team responsible for today? (Optional)"
              value={participantInfo.responsibilities}
              onChange={(e) => setParticipantInfo({ ...participantInfo, responsibilities: e.target.value })}
              style={{ padding: '10px 12px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', minHeight: '80px', fontFamily: 'var(--font-sans)' }}
            />
            <button
              onClick={handleParticipantInfoSubmit}
              style={{
                padding: '12px 32px',
                fontSize: '15px',
                fontWeight: '500',
                border: '0.5px solid var(--color-border-secondary)',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--color-background-primary)',
                cursor: 'pointer',
                color: 'var(--color-text-primary)'
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STAGE: ASSESSMENT */}
      {stage === 'assessment' && (
        <div>
          {/* Progress indicator */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <span>Question {currentQuestionIndex + 1} of {getTotalQuestions()}</span>
              <span>{getDynamicProgress()}</span>
            </div>
            <div style={{ height: '4px', background: 'var(--color-background-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--color-text-primary)', width: `${(currentQuestionIndex / getTotalQuestions()) * 100}%`, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Question display */}
          {getCurrentQuestion() && (
            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {getCurrentQuestion().area}
              </p>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                {getCurrentQuestion().question.step}
              </p>
              <p style={{ fontSize: '15px', lineHeight: '1.6' }}>
                {getCurrentQuestion().question.question}
              </p>
            </div>
          )}

          {/* Conversation history */}
          {conversationHistory.length > 0 && (
            <div style={{ marginBottom: '2rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
              {conversationHistory.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    {msg.role === 'user' ? 'You' : 'Anthony'}
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: '1.5', padding: '8px 12px', background: msg.role === 'user' ? 'var(--color-background-secondary)' : 'var(--color-background-primary)', borderRadius: '4px', border: '0.5px solid var(--color-border-tertiary)' }}>
                    {msg.content}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Response input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <textarea
              ref={textareaRef}
              value={currentResponse}
              onChange={(e) => setCurrentResponse(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleResponseSubmit();
                }
              }}
              placeholder="Share your response here... (Ctrl+Enter to submit)"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '0.5px solid var(--color-border-secondary)',
                borderRadius: 'var(--border-radius-md)',
                minHeight: '80px',
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
            <button
              onClick={handleResponseSubmit}
              disabled={isLoading || !currentResponse.trim()}
              style={{
                padding: '10px 16px',
                border: '0.5px solid var(--color-border-secondary)',
                borderRadius: 'var(--border-radius-md)',
                background: isLoading ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                color: 'var(--color-text-primary)',
                opacity: isLoading || !currentResponse.trim() ? 0.5 : 1,
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE: PROCESSING */}
      {stage === 'processing' && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '1rem', fontWeight: '500' }}>
            Processing Your Assessment
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Thank you — that was incredibly helpful. I'm now organizing and preparing your assessment package.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-background-secondary)', borderTop: '3px solid var(--color-text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {assessmentData.length} responses captured • {selectedAreas.length} areas explored
          </p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <button
            onClick={generateDocx}
            style={{
              marginTop: '2rem',
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: '500',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-background-primary)',
              cursor: 'pointer',
              color: 'var(--color-text-primary)'
            }}
          >
            Generate Assessment Package
          </button>
          {exportStatus && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
              {exportStatus}
            </p>
          )}
        </div>
      )}

      {/* STAGE: COMPLETE */}
      {stage === 'complete' && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: '500' }}>
            ✓ Assessment Complete
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
            Your assessment package is ready. It's truly a pleasure learning more about your role, your operating model, your challenges, and your perspective.
          </p>
          <div style={{ background: 'var(--color-background-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', marginBottom: '2rem', textAlign: 'left', fontSize: '14px' }}>
            <p style={{ marginBottom: '8px' }}><strong>Included in your assessment:</strong></p>
            <ul style={{ margin: '0', paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>
              <li>Assessment conversation log</li>
              <li>Evidence from {assessmentData.length} responses</li>
              <li>Structured observations</li>
              <li>Participant metadata</li>
            </ul>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            From here, Lauren — RCM Insights Consultant — will prepare the next stage of analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export default RCMAssessment;
