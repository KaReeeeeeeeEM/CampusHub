declare module "mammoth/mammoth.browser" {
  export type MammothMessage = {
    type: string;
    message: string;
  };

  export type MammothHtmlResult = {
    value: string;
    messages: MammothMessage[];
  };

  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<MammothHtmlResult>;
}
