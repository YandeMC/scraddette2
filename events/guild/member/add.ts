import { Collection, type Snowflake } from "discord.js";

import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/logging.js";
import changeNickname from "../../../common/nicknames.js";
import { nth } from "../../../util/numbers.js";
import { rolesDatabase } from "./remove.js";

import type Event from "../../../common/types/event";

const event: Event<"guildMemberAdd"> = async function event(member) {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await log(`<:join:1041828456578682961> Member ${member.toString()} joined!`, "members");

	const greetings = [
		`Everybody please welcome ${member.toString()} to ${
			CONSTANTS.guild.name
		}; they’re our ${nth(CONSTANTS.guild.memberCount)} member!`,
		`A big shoutout to ${member.toString()}, we’re glad you’ve joined us as our ${nth(
			CONSTANTS.guild.memberCount,
		)} member!`,
		`Here we go again… ${member.toString()} is here, our ${nth(
			CONSTANTS.guild.memberCount,
		)} member!`,
		`||Do I always have to let you know when there is a new member?|| ${member.toString()} is here (our ${nth(
			CONSTANTS.guild.memberCount,
		)})!`,
		`Is it a bird? Is it a plane? No, it’s ${member.toString()}, our ${nth(
			CONSTANTS.guild.memberCount,
		)} member!`,
		`Welcome:tm: ${member.toString()}! You’re our ${nth(CONSTANTS.guild.memberCount)} member!`,
	];

	await CONSTANTS.channels.welcome?.send(
		`${CONSTANTS.emojis.misc.join} ${
			greetings[Math.floor(Math.random() * greetings.length)] ?? ""
		}${
			String(CONSTANTS.guild.memberCount).includes("87")
				? " (WAS THAT THE BITE OF 87?!?!?)"
				: ""
		}`,
	);

	await changeNickname(member, false);

	const inviters = (await CONSTANTS.guild.invites.fetch()).reduce((accumulator, invite) => {
		const inviter = invite.inviter?.id ?? "";
		accumulator.set(inviter, (accumulator.get(inviter) ?? 0) + (invite.uses ?? 0));
		return accumulator;
	}, new Collection<Snowflake, number>());
	inviters.map(async (count, user) => {
		if (count < 20) return;
		const inviter = await CONSTANTS.guild.members.fetch(user).catch(() => {});
		if (
			!inviter ||
			inviter.id === "279855717203050496" ||
			inviter.user.bot ||
			!CONSTANTS.roles.epic ||
			inviter.roles.resolve(CONSTANTS.roles.epic.id)
		)
			return;
		await inviter.roles.add(CONSTANTS.roles.epic, "Invited 20+ people");
		await CONSTANTS.channels.general?.send(
			`🎊 ${inviter.toString()} Thanks for inviting 20+ people! Here’s ${CONSTANTS.roles.epic.toString()} as a thank-you.`,
		);
	});

	const roles = rolesDatabase.data.find((entry) => entry.user === member.id);
	if (roles) {
		await member.roles.add(
			Object.entries(roles)
				.filter((role): role is [Snowflake, true] => role[1] === true)
				.map(([id]) => id),
		);
	}

	await CONSTANTS.channels.info?.setName(
		`Info - ${(CONSTANTS.guild.memberCount - 1).toLocaleString([], {
			compactDisplay: "short",
			maximumFractionDigits: 2,
			minimumFractionDigits: CONSTANTS.guild.memberCount > 1_000 ? 2 : 0,
			notation: "compact",
		})} members`,
		"Automated update to sync count",
	);
};
export default event;
