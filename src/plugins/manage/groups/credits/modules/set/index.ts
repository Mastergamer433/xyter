// Dependencies
import { CommandInteraction, MessageEmbed } from "discord.js";

// Configurations
import {
  successColor,
  errorColor,
  footerText,
  footerIcon,
} from "@config/embed";

// Handlers
import logger from "@logger";

// Helpers
import pluralize from "@helpers/pluralize";

// Models
import fetchUser from "@helpers/fetchUser";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";

// Function
export default {
  data: (command: SlashCommandSubcommandBuilder) => {
    return command
      .setName("set")
      .setDescription("Set credits to a user")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to set credits on.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("The amount you will set.")
          .setRequired(true)
      );
  },
  execute: async (interaction: CommandInteraction) => {
    const { options, user, guild } = interaction;

    const discordUser = options.getUser("user");
    const creditAmount = options.getInteger("amount");

    // If amount is null
    if (creditAmount === null) {
      return interaction?.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle("[:toolbox:] Manage - Credits (Set)")
            .setDescription(`We could not read your requested amount!`)
            .setTimestamp(new Date())
            .setColor(errorColor)
            .setFooter({ text: footerText, iconURL: footerIcon }),
        ],
      });
    }

    if (discordUser === null) {
      return interaction?.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle("[:toolbox:] Manage - Credits (Set)")
            .setDescription(`We could not read your requested user!`)
            .setTimestamp(new Date())
            .setColor(errorColor)
            .setFooter({ text: footerText, iconURL: footerIcon }),
        ],
      });
    }
    if (guild === null) {
      return interaction?.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle("[:toolbox:] Manage - Credits (Set)")
            .setDescription(`We could not read your guild!`)
            .setTimestamp(new Date())
            .setColor(errorColor)
            .setFooter({ text: footerText, iconURL: footerIcon }),
        ],
      });
    }

    // toUser Information
    const toUser = await fetchUser(discordUser, guild);

    // If toUser does not exist
    if (toUser === null) {
      return interaction?.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle("[:toolbox:] Manage - Credits (Set)")
            .setDescription(
              `We could not read your requested user from our database!`
            )
            .setTimestamp(new Date())
            .setColor(errorColor)
            .setFooter({ text: footerText, iconURL: footerIcon }),
        ],
      });
    }

    // If toUser.credits does not exist
    if (toUser?.credits === null) {
      return interaction?.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle("[:toolbox:] Manage - Credits (Set)")
            .setDescription(
              `We could not find credits for ${discordUser} in our database!`
            )
            .setTimestamp(new Date())
            .setColor(errorColor)
            .setFooter({ text: footerText, iconURL: footerIcon }),
        ],
      });
    }

    // Set toUser with amount
    toUser.credits = creditAmount;

    // Save toUser
    await toUser?.save()?.then(async () => {
      logger?.debug(
        `Guild: ${guild?.id} User: ${user?.id} set ${
          discordUser?.id
        } to ${pluralize(creditAmount, "credit")}.`
      );

      return interaction?.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle("[:toolbox:] Manage - Credits (Set)")
            .setDescription(
              `We have set ${discordUser} to ${pluralize(
                creditAmount,
                "credit"
              )}.`
            )
            .setTimestamp(new Date())
            .setColor(successColor)
            .setFooter({ text: footerText, iconURL: footerIcon }),
        ],
      });
    });
  },
};