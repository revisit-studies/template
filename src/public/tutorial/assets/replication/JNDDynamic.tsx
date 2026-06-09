// Placeholder for tutorial dynamic replication sequence
import { JumpFunctionParameters, JumpFunctionReturnVal } from '../../../../store/types';

export default function func({ }: JumpFunctionParameters<{ r1: number, r2: number, counter: number }>): JumpFunctionReturnVal {
    return {
        component: 'trial',
    };
}