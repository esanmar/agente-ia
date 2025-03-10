'use client';

import Img from 'next/image';
import * as React from 'react';
import { FormEvent, Suspense, useState } from 'react';
import {
  Step,
  StepContent,
  StepDesc,
  StepItem,
  StepNumber,
  StepTitle
} from './components/step-list';
import { AgentInfo } from './components/agent-info';
import { CODES } from './constants/codes';
import type { AgentName, StepRecord } from './types';
import { AgentBlock } from './components/agent-block';
import {  IconLoader2 } from '@tabler/icons-react';

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page />
    </Suspense>
  );
}
const Page = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [agentStates, setAgentStates] = useState<{
    Wikipedia: false | 'loading' | StepRecord[];
    WolframAlpha: false | 'loading' | StepRecord[];
    Exa: false | 'loading' | StepRecord[];
    'Cross Reference': false | 'loading' | StepRecord[];
  }>({
    Wikipedia: false,
    WolframAlpha: false,
    Exa: false,
    'Cross Reference': false
  });

  const [agentInfoDisplay, setAgentInfoDisplay] = useState<AgentName | false>(
    false
  );
  const [currentStep, setCurrentStep] = useState(0);

  // form submit handler
  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let scrolledIntermediate = false;
    let intermediateLogged = false;

    try {
      setCurrentStep(1);
      setLoading(true);
      setProgress(null);
      setAgentStates({
        Wikipedia: false,
        WolframAlpha: false,
        Exa: false,
        'Cross Reference': false
      });
      const response = await fetch('/api/research', {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: query
      });
      const workflowRunId = (await response.json()).workflowRunId;

      const startTime = Date.now();
      const TIMEOUT_DURATION = 60000;
      const POLLING_INTERVAL = 2000;

      const pollStatus = async () => {
        try {
          const statusResponse = await fetch('/api/poll-outputs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              workflowRunId
            })
          });

          if (!statusResponse.ok) {
            throw new Error('Status check failed');
          }

          const result = await statusResponse.json();

          if (result.progress) {
            setLoading(false);
            if (result.progress === 'Call Agent Manager LLM') {
              setCurrentStep(intermediateLogged ? 3 : 2);
            } else {
              intermediateLogged = true;
            }
          }

          setProgress(result.progress);
          setAgentStates((prevStates) => ({
            ...prevStates,
            Wikipedia: result.wikipediaOutput || prevStates.Wikipedia,
            WolframAlpha: result.wolframAlphaOutput || prevStates.WolframAlpha,
            Exa: result.searchOutput || prevStates.Exa,
            'Cross Reference':
              result.crossReferenceOutput || prevStates['Cross Reference']
          }));

          if (
            (result.wikipediaOutput ||
              result.wolframAlphaOutput ||
              result.searchOutput) &&
            !scrolledIntermediate
          ) {
            if (result.wikipediaOutput) {
              setAgentInfoDisplay('Wikipedia');
            } else if (result.wolframAlphaOutput) {
              setAgentInfoDisplay('WolframAlpha');
            } else if (result.searchOutput) {
              setAgentInfoDisplay('Exa');
            }
            document
              .getElementById('intermediate-output')
              ?.scrollIntoView({ behavior: 'smooth' });
            scrolledIntermediate = true;
          }

          if (result.crossReferenceOutput) {
            setCurrentStep(5);
            document
              .getElementById('cross-reference-output')
              ?.scrollIntoView({ behavior: 'smooth' });
          }

          return result.crossReferenceOutput;
        } catch (error) {
          console.error('Polling error:', error);
          throw error;
        }
      };

      return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          if (Date.now() - startTime > TIMEOUT_DURATION) {
            clearInterval(interval);
            resolve('Timeout reached');
            return;
          }

          try {
            const isComplete = await pollStatus();
            if (isComplete) {
              setProgress(null);
              clearInterval(interval);
              resolve('All agents complete');
            }
          } catch (error) {
            clearInterval(interval);
            reject(error);
          }
        }, POLLING_INTERVAL);
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resolveStepStatus = (stepNumber: number) => {
    return currentStep === stepNumber
      ? 'loading'
      : currentStep > stepNumber
        ? 'done'
        : 'init';
  };

  const displayUsedResources = [...Object.entries(agentStates)]
    .filter(([key, value]) => value && key !== 'Cross Reference')
    .map(([key]) => key);

  return (
    <main>
      {progress && (
        <div className="fixed bottom-5 right-5 bg-purple-500/10 text-purple-500 border-purple-500 border-2 px-4 py-2 rounded-md font-semibold flex flex-row gap-2">
          <div>{progress}</div>
          <IconLoader2 className="animate-spin" size={28} />
        </div>
      )}

      <div className="pb-24">
        {/* header */}
        <header className="bg-purple-50  text-center">
          <div className="mx-auto max-w-screen-sm px-8 py-12">
            <h1 className="text-3xl font-bold">FreePlanTour Agent AI</h1>

            <div className="mt-2 text-lg opacity-60">
             
            </div>

            <div className="flex justify-center items-center gap-6 mt-4">
            
            </div>
          </div>
        </header>

        {/* step-by-step */}
        <section className="px-8 mx-auto max-w-screen-sm">
          <Step className="mt-16 md:mt-16">
            {/* step-1 */}
            <StepItem status={resolveStepStatus(1)}>
              <StepNumber order={1} status={resolveStepStatus(1)} />

              <StepTitle>Pregunta</StepTitle>
              <StepDesc>
               Haz una pregunta.
              </StepDesc>

              <StepContent>
                <form
                  onSubmit={handleSend}
                  className="flex flex-row gap-2 items-center"
                >
                  {/* search input */}
                  <input
                    placeholder="Cuál es la capital de España?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                    className="block w-full h-9 px-4 bg-white border border-gray-300 rounded-md"
                  />

                  <button
                    disabled={loading}
                    className={`h-9 rounded-md bg-purple-500 px-4 text-white ${
                      loading ? 'opacity-30' : ''
                    }`}
                  >
                    {loading ? 'Starting...' : 'Start'}
                  </button>
                </form>
              </StepContent>
            </StepItem>

            {/* step-2 */}
            <StepItem status={resolveStepStatus(2)}>
              <StepNumber order={2} status={resolveStepStatus(2)} />

              <StepTitle>Ver respuestas de distintas fuentes</StepTitle>
              <StepDesc>
                El agente de referencia cruzada organizará a los agentes trabajadores para obtener respuestas de diferentes recursos.
              </StepDesc>

              {currentStep > 1 && (
                <StepContent>
                  <div className="flex flex-col gap-4">
                    {displayUsedResources.length > 0 && (
                      <span className="opacity-60">
                        Your agent chose to use{' '}
                        {displayUsedResources.join(', ')} to answer your
                        question.
                      </span>
                    )}
                    <div className="flex gap-2 w-full">
                      <AgentBlock
                        name="Wikipedia"
                        agentInfoDisplay={agentInfoDisplay}
                        setAgentInfoDisplay={setAgentInfoDisplay}
                        isDisabled={agentStates['Wikipedia'] === false}
                      >
                        <Img
                          src="/icons/wikipedia.png"
                          width={34}
                          height={34}
                          alt="Wikipedia"
                          className={
                            agentStates['Wikipedia'] === false
                              ? 'opacity-60'
                              : 'opacity-100'
                          }
                        />
                      </AgentBlock>
                      <AgentBlock
                        name="WolframAlpha"
                        agentInfoDisplay={agentInfoDisplay}
                        setAgentInfoDisplay={setAgentInfoDisplay}
                        isDisabled={agentStates['WolframAlpha'] === false}
                      >
                        <Img
                          src="/icons/wolfram-alpha.png"
                          width={40}
                          height={40}
                          alt="WolframAlpha"
                          className={
                            agentStates['WolframAlpha'] === false
                              ? 'opacity-60'
                              : 'opacity-100'
                          }
                        />
                      </AgentBlock>
                      <AgentBlock
                        name="Exa"
                        agentInfoDisplay={agentInfoDisplay}
                        setAgentInfoDisplay={setAgentInfoDisplay}
                        isDisabled={agentStates['Exa'] === false}
                      >
                        <Img
                          src="/icons/exa.jpg"
                          width={30}
                          height={30}
                          alt="Exa"
                          className={
                            agentStates['Exa'] === false
                              ? 'opacity-60 rounded-md'
                              : 'opacity-100 rounded-md'
                          }
                        />
                      </AgentBlock>
                    </div>
                    {agentInfoDisplay && (
                      <AgentInfo
                        name={agentInfoDisplay}
                        code={CODES[agentInfoDisplay]}
                        state={agentStates[agentInfoDisplay]}
                      />
                    )}
                  </div>
                </StepContent>
              )}
            </StepItem>

            {/* step-3 */}
            <StepItem status={resolveStepStatus(3)}>
              <StepNumber order={3} status={resolveStepStatus(3)} />

              <StepTitle>Ver el resumen final</StepTitle>
              <StepDesc>
                Resumen de respuestas de diferentes fuentes
              </StepDesc>

              {currentStep > 2 && (
                <StepContent>
                  <AgentInfo
                    name="Cross Reference"
                    code={CODES['Cross Reference']}
                    state={agentStates['Cross Reference']}
                  />
                </StepContent>
              )}
            </StepItem>

            {/* step-4 */}
            <StepItem status={resolveStepStatus(4)}>
              <StepNumber order={4} status={resolveStepStatus(4)} />

              <StepTitle></StepTitle>
              <StepDesc>
            
              </StepDesc>

              {currentStep > 3 && (
                <StepContent>
                 
                </StepContent>
              )}
            </StepItem>
          </Step>
        </section>
      </div>
    </main>
  );
};
