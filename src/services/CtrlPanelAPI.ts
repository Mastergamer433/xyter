import axios, { AxiosInstance } from "axios";
import { Guild } from "discord.js";
import prisma from "../handlers/prisma";
import { upsertApiCredentials } from "../helpers/upsertApiCredentials";
import Encryption, { EncryptedData } from "../utils/encryption";

const encryption = new Encryption();

interface ApiCredentials {
  url: EncryptedData;
  token: EncryptedData;
  [key: string]: EncryptedData | unknown;
}

export class CtrlPanelAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CtrlPanelAPIError";
  }
}

class CtrlPanelAPI {
  private guild: Guild;
  private apiCredentials: ApiCredentials | null;
  private api: AxiosInstance;

  constructor(guild: Guild) {
    this.guild = guild;
    this.apiCredentials = null;
    this.api = axios.create();
  }

  private async fetchApiCredentials(): Promise<void> {
    const apiCredentials = await prisma.apiCredentials.findUnique({
      where: {
        guildId_apiName: {
          guildId: this.guild.id,
          apiName: "Ctrlpanel.gg",
        },
      },
    });

    if (!apiCredentials || !apiCredentials.credentials) {
      throw new CtrlPanelAPIError(
        "API credentials are required for this functionality. Please configure the CtrlPanel.gg API credentials for this guild."
      );
    }

    this.apiCredentials = apiCredentials.credentials as ApiCredentials;
  }

  private async getPlainUrl(): Promise<string> {
    if (!this.apiCredentials) {
      throw new CtrlPanelAPIError("API credentials not fetched");
    }

    const { url } = this.apiCredentials;
    return await encryption.decrypt(url);
  }

  private async getPlainToken(): Promise<string> {
    if (!this.apiCredentials) {
      throw new CtrlPanelAPIError("API credentials not fetched");
    }

    const { token } = this.apiCredentials;
    return await encryption.decrypt(token);
  }

  public async generateVoucher(
    code: string,
    amount: number,
    uses: number
  ): Promise<{ redeemUrl: string }> {
    await this.fetchApiCredentials();

    const plainUrl = await this.getPlainUrl();
    const plainToken = await this.getPlainToken();

    this.api.defaults.baseURL = plainUrl;
    this.api.defaults.headers.common["Authorization"] = plainToken
      ? `Bearer ${plainToken}`
      : undefined;

    const shopUrl = `${plainUrl}/store`;

    await this.api.post("vouchers", {
      uses,
      code,
      credits: amount,
      memo: `Generated by Discord Bot: ${this.guild.client.user.tag}`,
    });

    return { redeemUrl: `${shopUrl}?voucher=${code}` };
  }

  public async updateApiCredentials(
    scheme: string,
    domain: string,
    tokenData: string
  ): Promise<void> {
    const url = await encryption.encrypt(`${scheme}://${domain}`);
    const token = await encryption.encrypt(tokenData);

    if (!url || !token) {
      throw new Error("URL and token must be set");
    }

    const credentials = {
      url,
      token,
    };

    await upsertApiCredentials(this.guild, "Ctrlpanel.gg", credentials);
  }
}

export default CtrlPanelAPI;