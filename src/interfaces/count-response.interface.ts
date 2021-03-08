export default interface CountResponse<Type> {
  message: string;
  count: number;
  object: Type;
}
