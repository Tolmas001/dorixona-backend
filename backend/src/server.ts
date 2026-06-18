import buildApp from './app';

const start = async (): Promise<void> => {
  const app = await buildApp();

  try {
    await app.listen({
      port: app.config.PORT,
      host: app.config.HOST,
    });

    app.log.info(
      `Server is running at http://${app.config.HOST}:${app.config.PORT}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
