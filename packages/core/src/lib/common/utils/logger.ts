import { createLogger, format, transports } from "winston";
import { TransformableInfo } from "logform";
import * as chalk from "chalk";
const { combine, printf } = format;

const myFormatter = format((info: TransformableInfo) => {
    info.timestamp = new Date(Date.now()).toISOString();

    //Check logging level
    const levelUpper = info.level.toUpperCase();
    switch (levelUpper) {
        case "INFO":
            info.message = chalk.green(info.message);
            info.level = chalk.black.bgGreenBright.bold(info.level);
            break;

        case "WARN":
            info.message = chalk.yellow(info.message);
            info.level = chalk.black.bgYellowBright.bold(info.level);
            break;

        case "ERROR":
            info.message = chalk.red(info.message);
            info.level = chalk.black.bgRedBright.bold(info.level);
            break;

        default:
            break;
    }

    return info;
})();

export class Logger {
    private _logger;

    constructor(root: string, functionName: string) {
        const local_timestamp = new Date(Date.now());
        const date = local_timestamp.toISOString().split("T")[0];
        const time = local_timestamp.toISOString().split("T")[1].split(".")[0];
        const dateTime = (date + "_" + time).replaceAll(":", ".").replaceAll("-", ".");
        const name = `${functionName}`.toString().split(".")[0];
        const logPath = `${root}/logs/${name}/${dateTime}.log`;

        console.log("Log Path: " + logPath);

        this._logger = createLogger({
            level: "info",
            format: combine(
                myFormatter,
                printf((info: TransformableInfo) => {
                    return `[${chalk.rgb(125, 125, 125)(info.timestamp)}] [${info.level}]: ${info.message}`;
                })
            ),
            transports: [
                new transports.Console(),
                new transports.File({
                    filename: logPath,
                    maxsize: 5000000,
                    maxFiles: 1000,
                    format: combine(
                        myFormatter,
                        printf((info: TransformableInfo) => {
                            return `[${chalk.black.bgWhiteBright(info.timestamp)}] [${info.level}]: ${info.message}`;
                        })
                    ),
                }),
            ],
        });
    }

    public log(msg: string): void {
        this._logger.info(msg);
    }
    public error(msg: string): void {
        this._logger.error(msg);
    }
    public warn(msg: string): void {
        this._logger.warn(msg);
    }
}
