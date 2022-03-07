/** @file Command To get information about an addon. */
import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import CONSTANTS from "../common/CONSTANTS.js";

import escapeMessage, { escapeForInlineCode, escapeLinks } from "../lib/escape.js";
import generateTooltip from "../lib/generateTooltip.js";
import joinWithAnd from "../lib/joinWithAnd.js";

const addons = await fetch(
	"https://github.com/ScratchAddons/website-v2/raw/master/data/addons/en.json",
).then(
	async (response) =>
		/** @type {Promise<import("../types/addonManifest").WebsiteData>} */ (
			await response.json()
		),
);

/** @type {{ [key: string]: import("../types/addonManifest").default }} */
const manifestCache = {};

const fuse = new Fuse(addons, {
	findAllMatches: true,
	ignoreLocation: true,
	includeScore: true,

	keys: [
		{
			name: "id",
			weight: 1,
		},
		{
			name: "name",
			weight: 1,
		},
		{
			name: "description",
			weight: 0.5,
		},
	],
});

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Replies with information about a specific addon.")
		.addStringOption((option) =>
			option
				.setName("addon")
				.setDescription(
					"The name of the addon. Leave empty to learn about a random addon.",
				),
		),

	async interaction(interaction) {
		/**
		 * Generate a string of Markdown that credits the makers of an addon.
		 *
		 * @param {import("../types/addonManifest").default["credits"]} credits - Addon manifest.
		 *
		 * @returns {string | undefined} - Returns credit information or undefined if no credits are
		 *   available.
		 */
		function generateCredits(credits) {
			return joinWithAnd(
				credits?.map(({ name, link, note = "" }) =>
					link
						? `[${escapeLinks(name)}](${link} "${note}")`
						: note
						? generateTooltip(interaction, name, note)
						: name,
				) || [],
			);
		}

		const input = interaction.options.getString("addon");
		const { item, score = 0 } = input
			? fuse.search(input)[0] || {}
			: { item: addons[Math.floor(Math.random() * addons.length)] };

		if (!item) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} Could not find that addon${
					input ? ` (\`${escapeForInlineCode(input)}\`)` : ""
				}!`,

				ephemeral: true,
			});

			return;
		}
		const addon = (manifestCache[item.id] ||= await fetch(
			`${CONSTANTS.repos.sa}/addons/${item.id}/addon.json?date=${Date.now()}`,
		).then(async (response) => {
			return await /** @type {Promise<import("../types/addonManifest").default>} */ (
				response.json()
			);
		}));

		const lastUpdatedIn = `last updated in ${
			addon.latestUpdate?.version || "<unknown version>"
		}`;
		const latestUpdateInfo = addon.latestUpdate
			? ` (${
					addon.latestUpdate.temporaryNotice
						? generateTooltip(
								interaction,
								lastUpdatedIn,
								`${addon.latestUpdate?.temporaryNotice}`,
						  )
						: lastUpdatedIn
			  })`
			: "";

		const embed = new MessageEmbed()
			.setTitle(addon.name)
			.setColor(CONSTANTS.colors.theme)
			.setDescription(
				`${escapeMessage(addon.description)}\n[See source code](${
					CONSTANTS.repos.sa
				}/tree/master/addons/${encodeURIComponent(item.id)})${
					addon.permissions?.length
						? "\n\n**This addon may require additional permissions to be granted in order to function.**"
						: ""
				}`,
			)
			.setImage(
				`https://scratchaddons.com/assets/img/addons/${encodeURIComponent(item.id)}.png`,
			)
			.setFooter({
				text: input
					? Math.round((1 - score) * 100) + "% match" + CONSTANTS.footerSeperator + input
					: "Random addon",
			});

		const group = addon.tags.includes("popup")
			? "Extension Popup Features"
			: addon.tags.includes("easterEgg")
			? "Easter Eggs"
			: addon.tags.includes("theme")
			? "Themes"
			: addon.tags.includes("community")
			? "Scratch Website Features"
			: "Scratch Editor Features";

		if (group !== "Easter Eggs") {
			embed.setURL(
				`https://scratch.mit.edu/scratch-addons-extension/settings#addon-${encodeURIComponent(
					item.id,
				)}`,
			);
		}

		const credits = generateCredits(addon.credits);

		if (credits) embed.addField("Contributors", credits, true);

		embed.addFields([
			{
				inline: true,
				name: "Group",
				value: escapeMessage(group),
			},
			{
				inline: true,
				name: "Version added",
				value: escapeMessage(addon.versionAdded + latestUpdateInfo),
			},
		]);

		await interaction.reply({ embeds: [embed] });
	},
};

export default info;
