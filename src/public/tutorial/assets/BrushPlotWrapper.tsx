/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { BrushParams, BrushState } from './brush-components/assets/types';
import { BrushPlot } from './brush-components/assets/BrushPlot';
import { ParticipantData } from '../../../storage/types';

export default function BrushPlotWrapper({
  state, params, answers, onStateChange,
} :
{
  state?: BrushState,
  params: BrushParams,
  answers: ParticipantData['answers'],
  onStateChange?: (b: BrushState) => void
}) {
  return (
    <BrushPlot
      parameters={params}
      setAnswer={() => null}
      provenanceState={state ? { all: state } as any : undefined}
      updateState={onStateChange || (() => null)}
      answers={answers}
    />
  );
}
