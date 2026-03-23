export type BlockType = 'terminal' | 'code' | 'summary';

export interface Block {
  type: BlockType;
  data: any;
}