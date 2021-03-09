export default interface Response<Type> {
  message: string;
  count?: number;
  object: Type;
}
