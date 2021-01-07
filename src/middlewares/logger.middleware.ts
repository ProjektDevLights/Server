
export async function LoggerMiddleware(
  req: Request,
  res: Response,
  next: () => void,
) {
   console.log(req);
  next();
}
