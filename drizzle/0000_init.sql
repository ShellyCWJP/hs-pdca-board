CREATE TABLE `extra_dos` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`do_text` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `pdca_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feedbacks` (
	`record_id` text PRIMARY KEY NOT NULL,
	`advice` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `pdca_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_number_unique` ON `lessons` (`number`);--> statement-breakpoint
CREATE TABLE `pdca_records` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`status` text NOT NULL,
	`check_act` text,
	`achievement_rate` integer,
	`plan_confirmed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdca_records_student_lesson` ON `pdca_records` (`student_id`,`lesson_id`);--> statement-breakpoint
CREATE TABLE `plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`position` integer NOT NULL,
	`plan_text` text NOT NULL,
	`do_text` text,
	`do_status` text,
	FOREIGN KEY (`record_id`) REFERENCES `pdca_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);